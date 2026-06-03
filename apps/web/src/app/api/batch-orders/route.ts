import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { authOptions } from '@/lib/auth';

function generateBookingNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `BOK-${ts}-${rnd}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !('id' in session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const { batchId, quantity, deliveryArea, notes } = body;

    if (!batchId || !quantity || quantity < 1) {
      return NextResponse.json({ error: 'batchId and quantity are required' }, { status: 400 });
    }

    const batch = await db.batch.findUnique({
      where: { id: batchId },
      select: { id: true, isOpenForBooking: true, maxBookings: true, bookedCount: true, pricePerChick: true, status: true },
    });

    if (!batch || !batch.isOpenForBooking || batch.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This batch is not available for booking' }, { status: 400 });
    }

    if (batch.maxBookings != null) {
      const available = batch.maxBookings - batch.bookedCount;
      if (quantity > available) {
        return NextResponse.json(
          { error: `Only ${available} spots available for this batch` },
          { status: 400 },
        );
      }
    }

    const pricePerChick = Number(batch.pricePerChick || 0);
    const totalPrice = pricePerChick * quantity;
    const depositAmount = Math.ceil(totalPrice * 0.3);

    const [batchOrder] = await db.$transaction([
      db.batchOrder.create({
        data: {
          orderNumber: generateBookingNumber(),
          customerId: userId,
          batchId,
          quantity,
          pricePerChick,
          totalPrice,
          depositAmount,
          deliveryArea,
          notes,
          status: 'PENDING_PAYMENT',
        },
      }),
      db.batch.update({
        where: { id: batchId },
        data: { bookedCount: { increment: quantity } },
      }),
    ]);

    return NextResponse.json({ message: 'Batch order created', batchOrder }, { status: 201 });
  } catch (error) {
    console.error('Batch order creation error:', error);
    return NextResponse.json({ error: 'Failed to create batch order' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !('id' in session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const orders = await db.batchOrder.findMany({
      where: { customerId: userId },
      include: {
        batch: { select: { batchNumber: true, type: true, breed: true, startDate: true, expectedReady: true } },
        updates: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error('Batch orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch batch orders' }, { status: 500 });
  }
}
