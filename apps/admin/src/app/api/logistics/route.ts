import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';
import { notifyDriverAssigned, notifyCustomerPickedUp, notifyCustomerDelivered } from '@/lib/sms';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [deliveries, allDrivers, toAssign, outForDelivery, completedToday] = await Promise.all([
      db.delivery.findMany({
        where: { status: { notIn: ['RETURNED'] } },
        include: {
          order: {
            include: {
              customer: { select: { name: true, phone: true, email: true } },
              items: { include: { product: { select: { name: true, unit: true } } } },
            },
          },
          driver: true,
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      db.driver.findMany({ orderBy: { name: 'asc' } }),
      db.delivery.count({ where: { driverId: null, status: { notIn: ['DELIVERED', 'RETURNED', 'FAILED'] } } }),
      db.delivery.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
      db.delivery.count({ where: { status: 'DELIVERED', actualDate: { gte: todayStart } } }),
    ]);

    // Compute per-driver stats
    const driverStats: Record<string, { completedToday: number; activeDeliveries: number }> = {};
    for (const d of allDrivers) {
      driverStats[d.id] = { completedToday: 0, activeDeliveries: 0 };
    }
    for (const del of deliveries) {
      if (!del.driverId || !driverStats[del.driverId]) continue;
      if (del.status === 'DELIVERED' && del.actualDate && new Date(del.actualDate) >= todayStart) {
        driverStats[del.driverId].completedToday++;
      }
      if (['SCHEDULED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY'].includes(del.status)) {
        driverStats[del.driverId].activeDeliveries++;
      }
    }

    const availableDrivers = allDrivers.filter((d) => d.active && (driverStats[d.id]?.activeDeliveries || 0) === 0).length;

    const driversWithStats = allDrivers.map((d) => ({
      ...d,
      completedToday: driverStats[d.id]?.completedToday || 0,
      activeDeliveries: driverStats[d.id]?.activeDeliveries || 0,
      driverStatus: !d.active ? 'OFF_DUTY' : (driverStats[d.id]?.activeDeliveries || 0) > 0 ? 'ON_DELIVERY' : 'AVAILABLE',
    }));

    return NextResponse.json({
      deliveries,
      drivers: driversWithStats,
      stats: {
        toAssign,
        outForDelivery,
        completedToday,
        availableDrivers,
      },
    });
  } catch (error) {
    console.error('Logistics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch logistics data' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { deliveryId, driverId, status } = body;
    if (!deliveryId) return NextResponse.json({ error: 'deliveryId required' }, { status: 400 });

    const existing = await db.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: { include: { customer: { select: { name: true, phone: true } }, items: { include: { product: { select: { name: true } } } } } },
        driver: true,
      },
    });
    if (!existing) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

    const updateData: any = {};
    if (driverId !== undefined) updateData.driverId = driverId || null;
    if (status) {
      updateData.status = status;
      if (status === 'DELIVERED') updateData.actualDate = new Date();
    }

    const updated = await db.delivery.update({
      where: { id: deliveryId },
      data: updateData,
      include: {
        driver: true,
        order: { include: { customer: { select: { name: true, phone: true } }, items: { include: { product: { select: { name: true } } } } } },
      },
    });

    // Also sync order status when delivery status changes
    if (status === 'OUT_FOR_DELIVERY' && existing.order) {
      await db.order.update({ where: { id: existing.orderId }, data: { status: 'OUT_FOR_DELIVERY', driverId: driverId || existing.driverId || undefined } });
    }
    if (status === 'DELIVERED' && existing.order) {
      await db.order.update({ where: { id: existing.orderId }, data: { status: 'DELIVERED' } });
    }

    // SMS notifications
    const smsResults: string[] = [];
    try {
      // Driver assigned SMS
      if (driverId && driverId !== existing.driverId) {
        const driver = await db.driver.findUnique({ where: { id: driverId } });
        if (driver && existing.order) {
          const items = existing.order.items.map((i: any) => `${i.product.name}×${i.quantity}`).join(', ');
          const result = await notifyDriverAssigned(
            driver.phone, driver.name,
            existing.order.orderNumber, existing.order.customer.name,
            existing.order.deliveryArea || existing.order.deliveryAddress || '', items,
          );
          smsResults.push(result.sent ? 'Driver SMS sent' : `Driver SMS: ${result.error}`);
        }
      }
      // Picked up / out for delivery SMS to customer
      if (status === 'OUT_FOR_DELIVERY' && existing.status !== 'OUT_FOR_DELIVERY' && existing.order?.customer?.phone) {
        const driver = updated.driver || existing.driver;
        if (driver) {
          const result = await notifyCustomerPickedUp(
            existing.order.customer.phone, existing.order.orderNumber,
            driver.name, driver.phone,
          );
          smsResults.push(result.sent ? 'Customer pickup SMS sent' : `Customer SMS: ${result.error}`);
        }
      }
      // Delivered SMS to customer
      if (status === 'DELIVERED' && existing.status !== 'DELIVERED' && existing.order?.customer?.phone) {
        const result = await notifyCustomerDelivered(existing.order.customer.phone, existing.order.orderNumber);
        smsResults.push(result.sent ? 'Customer delivery SMS sent' : `Customer SMS: ${result.error}`);
      }
    } catch (smsErr) {
      console.error('SMS notification error:', smsErr);
      smsResults.push('SMS failed');
    }

    return NextResponse.json({ updated, smsResults });
  } catch (error) {
    console.error('Logistics PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 });
  }
}
