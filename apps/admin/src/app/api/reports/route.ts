import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const monthsParam = parseInt(searchParams.get('months') || '6');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const now = new Date();

    let rangeEnd = new Date(now);
    rangeEnd.setHours(23, 59, 59, 999);
    let rangeStart: Date;

    if (startDateParam && endDateParam) {
      rangeStart = new Date(startDateParam);
      rangeEnd = new Date(endDateParam);
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      const monthsToShow = Math.min(Math.max(monthsParam, 1), 24);
      rangeStart = new Date(now.getFullYear(), now.getMonth() - (monthsToShow - 1), 1);
    }

    // Compute number of calendar months in range (for monthly breakdown)
    const monthCount = Math.max(1, Math.min(
      (rangeEnd.getFullYear() - rangeStart.getFullYear()) * 12 +
      (rangeEnd.getMonth() - rangeStart.getMonth()) + 1,
      24
    ));

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);

    const orderWhere = { createdAt: { gte: rangeStart, lte: rangeEnd }, status: { notIn: ['CANCELLED', 'FAILED'] } } as any;
    const expenseWhere = { date: { gte: rangeStart, lte: rangeEnd } };

    const [
      revenueAgg,
      lastMonthRevenueAgg,
      thisMonthRevenueAgg,
      totalOrderCount,
      lastMonthOrderCount,
      totalCustomers,
      lastMonthCustomers,
      topProductsRaw,
      expenseAgg,
      batchDepositsAgg,
      expenseByCategoryRaw,
      topCustomersRaw,
      eggRecordsRaw,
      activeBatches,
      feedCostAgg,
      ordersLast60d,
      monthlyData,
    ] = await Promise.all([
      db.order.aggregate({ where: orderWhere, _sum: { total: true } }),
      db.order.aggregate({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true } }),
      db.order.aggregate({ where: { createdAt: { gte: thisMonthStart }, status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true }, _count: { id: true } }),
      db.order.count({ where: orderWhere }),
      db.order.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { notIn: ['CANCELLED', 'FAILED'] } } }),
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      db.orderItem.groupBy({
        by: ['productId'],
        where: { order: orderWhere },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 8,
      }),
      db.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      db.batchOrder.aggregate({ where: { createdAt: { gte: rangeStart, lte: rangeEnd }, depositPaid: true }, _sum: { depositAmount: true }, _count: { id: true } }),
      // Expenses grouped by category
      db.expense.groupBy({ by: ['category'], where: expenseWhere, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
      // Top customers by spend
      db.order.groupBy({
        by: ['customerId'],
        where: orderWhere,
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 8,
      }),
      // Egg production last 30 days
      db.eggProduction.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        select: { date: true, collected: true },
      }),
      // Active batches for mortality summary
      db.batch.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, batchNumber: true, type: true, quantity: true, currentCount: true, startDate: true },
        orderBy: { startDate: 'desc' },
        take: 10,
      }),
      // Feed purchases (all time) for efficiency calc
      db.feedPurchase.aggregate({ _sum: { totalCost: true } }),
      // Orders last 60 days for daily trend + forecast
      db.order.findMany({
        where: { createdAt: { gte: sixtyDaysAgo }, status: { notIn: ['CANCELLED', 'FAILED'] } },
        select: { createdAt: true, total: true },
      }),
      // Monthly breakdown
      Promise.all(
        Array.from({ length: monthCount }, (_, i) => {
          const yr = rangeStart.getFullYear();
          const mo = rangeStart.getMonth() + i;
          const monthStart = new Date(yr, mo, 1);
          const monthEnd = new Date(yr, mo + 1, 0, 23, 59, 59);
          if (monthStart > rangeEnd) return Promise.resolve(null);
          return Promise.all([
            db.order.aggregate({ where: { createdAt: { gte: monthStart, lte: monthEnd }, status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true }, _count: { id: true } }),
            db.expense.aggregate({ where: { date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
            db.batchOrder.aggregate({ where: { createdAt: { gte: monthStart, lte: monthEnd }, depositPaid: true }, _sum: { depositAmount: true } }),
            monthStart,
          ]);
        }),
      ),
    ]);

    // Revenue by product category
    const categoryRevenue = await db.orderItem.groupBy({
      by: ['productId'],
      where: { order: orderWhere },
      _sum: { subtotal: true },
    });
    const allProducts = await db.product.findMany({ select: { id: true, category: true } });
    const prodCatMap = Object.fromEntries(allProducts.map((p) => [p.id, p.category]));
    const catRevMap: Record<string, number> = {};
    for (const item of categoryRevenue) {
      const cat = prodCatMap[item.productId] || 'OTHER';
      catRevMap[cat] = (catRevMap[cat] || 0) + Number(item._sum?.subtotal || 0);
    }
    const batchDepositTotal = Number(batchDepositsAgg._sum.depositAmount || 0);
    if (batchDepositTotal > 0) catRevMap['BATCH_BOOKINGS'] = batchDepositTotal;

    // Product names for top products
    const productIds = topProductsRaw.map((p) => p.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, category: true } });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    // Customer names for top customers
    const customerIds = topCustomersRaw.map((c) => c.customerId);
    const customerNames = await db.user.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, email: true } });
    const customerNameMap = Object.fromEntries(customerNames.map((c) => [c.id, c]));

    // Revenue aggregates
    const totalRevenueNum = Number(revenueAgg._sum?.total || 0) + batchDepositTotal;
    const lastMonthRevNum = Number(lastMonthRevenueAgg._sum?.total || 0);
    const revenueTrend = lastMonthRevNum > 0
      ? Math.round(((Number(thisMonthRevenueAgg._sum?.total || 0) - lastMonthRevNum) / lastMonthRevNum) * 100)
      : null;
    const totalExpensesNum = Number(expenseAgg._sum.amount || 0);

    // Egg trend: aggregate by day, fill gaps
    const eggMap: Record<string, number> = {};
    for (const e of eggRecordsRaw) {
      const day = e.date.toISOString().slice(0, 10);
      eggMap[day] = (eggMap[day] || 0) + e.collected;
    }
    const eggTrend30d = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, collected: eggMap[key] || 0 };
    });
    const totalEggsLast30d = eggTrend30d.reduce((s, e) => s + e.collected, 0);

    // Daily revenue (60 days) for forecast
    const dailyRevenueMap: Record<string, number> = {};
    for (const o of ordersLast60d) {
      const day = o.createdAt.toISOString().slice(0, 10);
      dailyRevenueMap[day] = (dailyRevenueMap[day] || 0) + Number(o.total || 0);
    }
    const dailyRevenue60d = Array.from({ length: 60 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (59 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, revenue: dailyRevenueMap[key] || 0 };
    });

    // Mortality per batch
    const mortalityByBatch = activeBatches.map((b) => {
      const totalDead = Math.max(0, b.quantity - b.currentCount);
      const mortalityRate = b.quantity > 0 ? Math.round((totalDead / b.quantity) * 1000) / 10 : 0;
      const ageInDays = Math.floor((now.getTime() - new Date(b.startDate).getTime()) / 86400000);
      return { id: b.id, batchNumber: b.batchNumber, type: b.type, quantity: b.quantity, currentCount: b.currentCount, totalDead, mortalityRate, ageInDays };
    }).sort((a, b) => b.mortalityRate - a.mortalityRate);

    // Feed efficiency
    const totalFeedCost = Number(feedCostAgg._sum.totalCost || 0);
    const totalActiveBirds = activeBatches.reduce((s, b) => s + b.currentCount, 0);
    const feedEfficiency = {
      totalFeedCost,
      activeBirds: totalActiveBirds,
      eggsLast30d: totalEggsLast30d,
      feedCostPerBird: totalActiveBirds > 0 ? Math.round((totalFeedCost / totalActiveBirds) * 100) / 100 : 0,
      feedCostPerEgg: totalEggsLast30d > 0 ? Math.round((totalFeedCost / totalEggsLast30d) * 100) / 100 : 0,
    };

    // Monthly P&L
    const monthly = (monthlyData as any[])
      .filter((m) => m !== null)
      .map(([orderAgg, expenseAgg, batchAgg, date]: any) => {
        const revenue = Number(orderAgg._sum?.total || 0) + Number(batchAgg._sum?.depositAmount || 0);
        const expenses = Number(expenseAgg._sum?.amount || 0);
        return {
          month: (date as Date).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
          revenue, expenses, profit: revenue - expenses,
          orders: orderAgg._count?.id || 0,
        };
      });

    return NextResponse.json({
      summary: {
        totalRevenue: totalRevenueNum,
        productRevenue: Number(revenueAgg._sum?.total || 0),
        batchBookingDeposits: batchDepositTotal,
        batchBookingCount: (batchDepositsAgg._count as any).id ?? 0,
        revenueTrend,
        totalOrders: totalOrderCount,
        ordersTrend: lastMonthOrderCount > 0 ? ((thisMonthRevenueAgg._count as any).id ?? 0) - lastMonthOrderCount : null,
        avgOrderValue: totalOrderCount > 0 ? Math.round(Number(revenueAgg._sum?.total || 0) / totalOrderCount) : 0,
        totalCustomers,
        newCustomersLastMonth: lastMonthCustomers,
        totalExpenses: totalExpensesNum,
        netProfit: totalRevenueNum - totalExpensesNum,
      },
      revenueByCategory: Object.entries(catRevMap).map(([category, value]) => ({ category, value })),
      monthly,
      topProducts: topProductsRaw.map((p) => ({
        productId: p.productId,
        name: productMap[p.productId]?.name || 'Unknown',
        category: productMap[p.productId]?.category || '',
        totalQty: p._sum?.quantity || 0,
        totalRevenue: Number(p._sum?.subtotal || 0),
      })),
      topCustomers: topCustomersRaw.map((c) => ({
        customerId: c.customerId,
        name: customerNameMap[c.customerId]?.name || 'Unknown',
        email: customerNameMap[c.customerId]?.email || '',
        orderCount: (c._count as any).id ?? 0,
        totalSpent: Number(c._sum?.total || 0),
      })),
      expensesByCategory: expenseByCategoryRaw.map((e) => ({
        category: e.category,
        amount: Number(e._sum.amount || 0),
      })),
      eggTrend30d,
      mortalityByBatch,
      feedEfficiency,
      dailyRevenue60d,
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch reports data' }, { status: 500 });
  }
}
