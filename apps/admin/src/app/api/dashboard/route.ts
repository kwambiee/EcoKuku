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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeBatches,
      eggsToday,
      eggsYesterday,
      ordersToday,
      ordersYesterday,
      revenueToday,
      revenueYesterday,
      recentOrders,
      lowStockProducts,
      pendingBatchOrders,
    ] = await Promise.all([
      db.batch.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, currentCount: true, batchNumber: true, type: true },
      }),
      db.eggProduction.aggregate({
        where: { date: { gte: todayStart } },
        _sum: { collected: true },
      }),
      db.eggProduction.aggregate({
        where: { date: { gte: yesterdayStart, lt: todayStart } },
        _sum: { collected: true },
      }),
      db.order.count({ where: { createdAt: { gte: todayStart } } }),
      db.order.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      db.order.aggregate({
        where: { createdAt: { gte: todayStart }, status: { notIn: ['CANCELLED', 'FAILED'] } },
        _sum: { total: true },
      }),
      db.order.aggregate({
        where: { createdAt: { gte: yesterdayStart, lt: todayStart }, status: { notIn: ['CANCELLED', 'FAILED'] } },
        _sum: { total: true },
      }),
      db.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true } },
          items: { take: 1, include: { product: { select: { name: true } } } },
        },
      }),
      db.product.findMany({
        where: { available: true, stock: { lt: 50 } },
        orderBy: { stock: 'asc' },
        take: 5,
        select: { id: true, name: true, stock: true, category: true },
      }),
      db.batchOrder.count({
        where: { status: { in: ['PENDING_PAYMENT', 'CONFIRMED'] } },
      }),
    ]);

    const totalBirds = activeBatches.reduce((sum, b) => sum + b.currentCount, 0);

    const mortalityThisMonth = await db.mortalityLog.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { count: true },
    });

    return NextResponse.json({
      metrics: {
        totalBirds,
        activeBatchCount: activeBatches.length,
        eggsToday: eggsToday._sum.collected || 0,
        eggsTrend: eggsYesterday._sum.collected ? Math.round(((eggsToday._sum.collected || 0) - eggsYesterday._sum.collected) / eggsYesterday._sum.collected * 100) : null,
        ordersToday,
        ordersTrend: ordersYesterday ? ordersToday - ordersYesterday : null,
        revenueToday: Number(revenueToday._sum.total || 0),
        revenueTrend: revenueYesterday._sum.total ? Math.round((Number(revenueToday._sum.total || 0) - Number(revenueYesterday._sum.total)) / Number(revenueYesterday._sum.total) * 100) : null,
        mortalityThisMonth: mortalityThisMonth._sum.count || 0,
        pendingBatchOrders,
      },
      recentOrders,
      lowStockProducts,
      activeBatches,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
