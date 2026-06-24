import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const status = searchParams.get('status');
    const batchId = searchParams.get('batchId');
    const where: any = {};
    if (status) where.status = status;
    if (batchId) where.batchId = batchId;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [orders, total, activeBatches] = await Promise.all([
      db.batchOrder.findMany({
        where, take: limit,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          batch: { select: { id: true, batchNumber: true, type: true, startDate: true, expectedReady: true, currentCount: true, bookedCount: true, status: true } },
          updates: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.batchOrder.count({ where }),
      db.batch.findMany({
        where: { status: { in: ['ACTIVE'] }, expectedReady: { not: null } },
        select: { id: true, batchNumber: true, type: true, currentCount: true, bookedCount: true, expectedReady: true, status: true },
        orderBy: { expectedReady: 'asc' },
      }),
    ]);

    const openBookings = orders.filter((o: any) => ['PENDING_PAYMENT', 'CONFIRMED', 'GROWING'].includes(o.status)).length;
    const dueThisMonth = orders.filter((o: any) => {
      if (!o.expectedReadyDate) return false;
      const d = new Date(o.expectedReadyDate);
      return d >= monthStart && d <= monthEnd && !['COMPLETED', 'CANCELLED'].includes(o.status);
    }).length;
    const totalDeposit = orders
      .filter((o: any) => o.depositPaid)
      .reduce((s: number, o: any) => s + Number(o.depositAmount), 0);
    const fulfilledThisMonth = orders.filter((o: any) => {
      if (o.status !== 'COMPLETED') return false;
      const d = new Date(o.updatedAt);
      return d >= monthStart && d <= monthEnd;
    }).length;

    const supplyDemand = activeBatches.map((batch) => {
      const batchBookings = orders.filter((o: any) => o.batchId === batch.id && o.status !== 'CANCELLED');
      const totalBooked = batchBookings.reduce((s: number, o: any) => s + o.quantity, 0);
      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        type: batch.type,
        expectedReady: batch.expectedReady,
        availableSupply: batch.currentCount,
        totalBooked,
        surplus: batch.currentCount - totalBooked,
        isShort: totalBooked > batch.currentCount,
        bookings: batchBookings.map((o: any) => ({
          id: o.id, orderNumber: o.orderNumber, quantity: o.quantity,
          customerName: o.customer.name, status: o.status,
        })),
      };
    });

    return NextResponse.json({
      data: orders,
      pagination: { total, pages: 1 },
      stats: { openBookings, dueThisMonth, totalDeposit, fulfilledThisMonth },
      supplyDemand,
    });
  } catch (error) {
    console.error('Batch orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch batch orders' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { batchOrderId, status, updateMessage, updateTitle, batchId, refundNote } = body;
    if (!batchOrderId || !status) return NextResponse.json({ error: 'batchOrderId and status required' }, { status: 400 });

    const updateData: any = { status };
    if (batchId) updateData.batchId = batchId;

    const updated = await db.batchOrder.update({
      where: { id: batchOrderId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        batch: { select: { id: true, batchNumber: true, type: true } },
      },
    });

    const statusLabels: Record<string, string> = {
      CONFIRMED: 'Booking Confirmed',
      GROWING: 'Chicks Now Growing',
      READY: 'Ready for Pickup / Delivery',
      COMPLETED: 'Booking Fulfilled',
      CANCELLED: 'Booking Cancelled',
    };

    const msg = status === 'CANCELLED' && refundNote
      ? `Your booking has been cancelled. Refund note: ${refundNote}`
      : updateMessage || `Your batch order status has been updated to: ${statusLabels[status] || status}.`;

    await db.batchOrderUpdate.create({
      data: {
        batchOrderId,
        title: updateTitle || statusLabels[status] || `Status: ${status}`,
        message: msg,
        type: status === 'CANCELLED' ? 'ALERT' : 'MILESTONE',
      },
    });

    return NextResponse.json({ message: 'Batch order updated', order: updated });
  } catch (error) {
    console.error('Batch order update error:', error);
    return NextResponse.json({ error: 'Failed to update batch order' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    if (action === 'convert_to_order') {
      const { batchOrderId } = body;
      if (!batchOrderId) return NextResponse.json({ error: 'batchOrderId required' }, { status: 400 });

      const booking = await db.batchOrder.findUnique({
        where: { id: batchOrderId },
        include: { customer: true, batch: true },
      });
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      if (booking.status !== 'READY') {
        return NextResponse.json({ error: 'Only READY bookings can be converted to orders' }, { status: 400 });
      }

      let product = await db.product.findFirst({
        where: { category: 'LIVE_POULTRY', type: { contains: booking.batch.type } },
      });
      if (!product) {
        product = await db.product.create({
          data: {
            sku: `SKU-${Date.now().toString(36).toUpperCase()}`,
            name: `Live ${booking.batch.type} — ${booking.batch.batchNumber}`,
            description: `From batch ${booking.batch.batchNumber}`,
            type: booking.batch.type,
            category: 'LIVE_POULTRY',
            price: booking.pricePerChick,
            unit: 'per bird',
            stock: booking.batch.currentCount,
          },
        });
      }

      const balance = Number(booking.totalPrice) - Number(booking.depositAmount);
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      const order = await db.order.create({
        data: {
          orderNumber,
          customerId: booking.customerId,
          orderType: 'PREORDER',
          status: 'PROCESSING',
          subtotal: booking.totalPrice,
          deliveryFee: 0,
          discountAmount: booking.depositAmount,
          total: balance,
          paymentMethod: 'MPESA',
          paymentRef: booking.depositPaymentRef || null,
          deliveryArea: booking.deliveryArea || null,
          deliveryDate: booking.expectedReadyDate || null,
          notes: `Converted from batch booking ${booking.orderNumber}. Deposit KSh ${Number(booking.depositAmount).toLocaleString()} already paid.`,
          items: {
            create: {
              productId: product.id,
              quantity: booking.quantity,
              price: booking.pricePerChick,
              subtotal: booking.totalPrice,
            },
          },
        },
      });

      await db.batchOrder.update({
        where: { id: batchOrderId },
        data: { status: 'COMPLETED' },
      });

      await db.batchOrderUpdate.create({
        data: {
          batchOrderId,
          title: 'Converted to Order',
          message: `Your booking has been converted to order ${orderNumber}. Balance remaining: KSh ${balance.toLocaleString()}.`,
          type: 'MILESTONE',
        },
      });

      await db.batch.update({
        where: { id: booking.batchId },
        data: { currentCount: { decrement: booking.quantity } },
      });

      return NextResponse.json({ message: 'Booking converted to order', order, orderNumber }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Batch order POST error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
