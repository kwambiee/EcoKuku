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
    const where: any = {};
    if (status) where.status = status;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);

    const [orders, total, newToday, outForDelivery, deliveredToday, cancelledWeek] = await Promise.all([
      db.order.findMany({
        where, take: limit,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          items: { include: { product: { select: { id: true, name: true, type: true, image: true, unit: true } } } },
          driver: { select: { id: true, name: true, phone: true, vehicle: true } },
          delivery: { select: { id: true, status: true, scheduledDate: true, actualDate: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.order.count({ where }),
      db.order.count({ where: { status: 'PENDING', createdAt: { gte: todayStart } } }),
      db.order.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
      db.order.count({ where: { status: 'DELIVERED', updatedAt: { gte: todayStart } } }),
      db.order.count({ where: { status: { in: ['CANCELLED', 'FAILED'] }, updatedAt: { gte: weekStart } } }),
    ]);

    return NextResponse.json({
      data: orders,
      pagination: { total, pages: 1 },
      stats: { newToday, outForDelivery, deliveredToday, cancelledWeek },
    });
  } catch (error) {
    console.error('Admin orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { orderId, status, driverId, notes, paymentRef } = body;
    if (!orderId || !status) return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });

    const existing = await db.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, customer: true, delivery: true },
    });
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const updateData: any = { status };
    if (driverId !== undefined) updateData.driverId = driverId || null;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentRef !== undefined) updateData.paymentRef = paymentRef;

    // Auto-deduct inventory when status moves to PROCESSING
    if (status === 'PROCESSING' && existing.status !== 'PROCESSING') {
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Restore inventory if moving back from PROCESSING or cancelling a PROCESSING order
    if (
      (status === 'CANCELLED' && ['PROCESSING', 'PACKED'].includes(existing.status)) ||
      (status === 'PENDING' && existing.status === 'PROCESSING')
    ) {
      for (const item of existing.items) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    // When moving to OUT_FOR_DELIVERY, create/update delivery record
    if (status === 'OUT_FOR_DELIVERY' && existing.status !== 'OUT_FOR_DELIVERY') {
      const deliveryDriverId = driverId || existing.driverId;
      if (existing.delivery) {
        await db.delivery.update({
          where: { id: existing.delivery.id },
          data: { status: 'OUT_FOR_DELIVERY', driverId: deliveryDriverId || null },
        });
      } else {
        await db.delivery.create({
          data: {
            orderId,
            driverId: deliveryDriverId || null,
            status: 'OUT_FOR_DELIVERY',
            scheduledDate: existing.deliveryDate || new Date(),
            location: existing.deliveryArea || null,
          },
        });
      }
    }

    // When delivered, mark delivery complete and post revenue
    if (status === 'DELIVERED' && existing.status !== 'DELIVERED') {
      if (existing.delivery) {
        await db.delivery.update({
          where: { id: existing.delivery.id },
          data: { status: 'DELIVERED', actualDate: new Date() },
        });
      }
    }

    const order = await db.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: { include: { product: true } },
        driver: { select: { id: true, name: true, phone: true, vehicle: true } },
        delivery: true,
      },
    });

    return NextResponse.json({ message: 'Order updated', order });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
