import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [deliveries, drivers, metrics] = await Promise.all([
      db.delivery.findMany({
        where: { status: { notIn: ['DELIVERED', 'RETURNED'] } },
        include: {
          order: {
            include: {
              customer: { select: { name: true, phone: true } },
            },
          },
          driver: true,
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      db.driver.findMany({ where: { active: true } }),
      Promise.all([
        db.delivery.count({ where: { scheduledDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, status: { not: 'RETURNED' } } }),
        db.delivery.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
        db.delivery.count({ where: { status: 'DELIVERED', actualDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      ]).then(([todayTotal, inTransit, completed]) => ({ todayTotal, inTransit, completed })),
    ]);

    return NextResponse.json({ deliveries, drivers, metrics });
  } catch (error) {
    console.error('Logistics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch logistics data' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deliveryId, driverId, status } = body;

    if (!deliveryId) {
      return NextResponse.json({ error: 'deliveryId required' }, { status: 400 });
    }

    const updated = await db.delivery.update({
      where: { id: deliveryId },
      data: {
        ...(driverId ? { driverId } : {}),
        ...(status ? { status, ...(status === 'DELIVERED' ? { actualDate: new Date() } : {}) } : {}),
      },
      include: { driver: true },
    });

    return NextResponse.json({ updated });
  } catch (error) {
    console.error('Logistics PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 });
  }
}
