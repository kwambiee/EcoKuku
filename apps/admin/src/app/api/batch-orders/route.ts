import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const batchId = searchParams.get('batchId');

    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (batchId) where.batchId = batchId;

    const [orders, total] = await Promise.all([
      db.batchOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          batch: { select: { id: true, batchNumber: true, type: true, startDate: true, expectedReady: true } },
          updates: { orderBy: { createdAt: 'desc' }, take: 3 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.batchOrder.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Batch orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch batch orders' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { batchOrderId, status, updateMessage, updateTitle } = body;

    if (!batchOrderId || !status) {
      return NextResponse.json({ error: 'batchOrderId and status are required' }, { status: 400 });
    }

    const updated = await db.batchOrder.update({
      where: { id: batchOrderId },
      data: { status },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        batch: { select: { batchNumber: true } },
      },
    });

    // Create a timeline update for the customer
    if (updateMessage || updateTitle) {
      const statusLabels: Record<string, string> = {
        CONFIRMED: 'Order Confirmed',
        GROWING: 'Chicks Now Growing',
        READY: 'Ready for Pickup/Delivery',
        COMPLETED: 'Order Completed',
        CANCELLED: 'Order Cancelled',
      };
      await db.batchOrderUpdate.create({
        data: {
          batchOrderId,
          title: updateTitle || statusLabels[status] || `Status: ${status}`,
          message: updateMessage || `Your batch order status has been updated to: ${status}.`,
          type: status === 'CANCELLED' ? 'ALERT' : 'MILESTONE',
        },
      });
    }

    return NextResponse.json({ message: 'Batch order updated', order: updated });
  } catch (error) {
    console.error('Batch order update error:', error);
    return NextResponse.json({ error: 'Failed to update batch order' }, { status: 500 });
  }
}
