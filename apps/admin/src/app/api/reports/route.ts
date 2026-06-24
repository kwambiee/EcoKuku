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
    const monthsParam = parseInt(searchParams.get('months') || '6');
    const monthsToShow = Math.min(Math.max(monthsParam, 1), 24);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalRevenue,
      lastMonthRevenue,
      totalOrders,
      lastMonthOrders,
      totalCustomers,
      lastMonthCustomers,
      topProducts,
      totalExpenses,
      batchBookingDeposits,
      monthlyData,
    ] = await Promise.all([
      db.order.aggregate({ where: { status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true } }),
      db.order.aggregate({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true } }),
      db.order.count({ where: { status: { notIn: ['CANCELLED', 'FAILED'] } } }),
      db.order.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { notIn: ['CANCELLED', 'FAILED'] } } }),
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      db.orderItem.groupBy({
        by: ['productId'],
        where: { order: { status: { notIn: ['CANCELLED', 'FAILED'] } } },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      db.expense.aggregate({ _sum: { amount: true } }),
      // Batch booking deposits paid
      db.batchOrder.aggregate({ where: { depositPaid: true }, _sum: { depositAmount: true }, _count: { id: true } }),
      // Monthly breakdown: revenue + batch deposits + expenses
      Promise.all(
        Array.from({ length: monthsToShow }, (_, i) => {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - (monthsToShow - 1 - i), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - (monthsToShow - 1 - i) + 1, 0, 23, 59, 59);
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
      where: { order: { status: { notIn: ['CANCELLED', 'FAILED'] } } },
      _sum: { subtotal: true },
    });
    const allProducts = await db.product.findMany({ select: { id: true, category: true } });
    const prodCatMap = Object.fromEntries(allProducts.map((p) => [p.id, p.category]));
    const catRevMap: Record<string, number> = {};
    for (const item of categoryRevenue) {
      const cat = prodCatMap[item.productId] || 'OTHER';
      catRevMap[cat] = (catRevMap[cat] || 0) + Number(item._sum.subtotal || 0);
    }
    const batchDepositTotal = Number(batchBookingDeposits._sum.depositAmount || 0);
    if (batchDepositTotal > 0) catRevMap['BATCH_BOOKINGS'] = batchDepositTotal;

    // Product names for top products
    const productIds = topProducts.map((p) => p.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, category: true } });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    const thisMonthRevenue = await db.order.aggregate({ where: { createdAt: { gte: thisMonthStart }, status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true }, _count: { id: true } });

    const totalRevenueNum = Number(totalRevenue._sum.total || 0) + batchDepositTotal;
    const lastMonthRevenueNum = Number(lastMonthRevenue._sum.total || 0);
    const revenueTrend = lastMonthRevenueNum > 0
      ? Math.round(((Number(thisMonthRevenue._sum.total || 0) - lastMonthRevenueNum) / lastMonthRevenueNum) * 100)
      : null;
    const totalExpensesNum = Number(totalExpenses._sum.amount || 0);

    return NextResponse.json({
      summary: {
        totalRevenue: totalRevenueNum,
        productRevenue: Number(totalRevenue._sum.total || 0),
        batchBookingDeposits: batchDepositTotal,
        batchBookingCount: batchBookingDeposits._count.id,
        revenueTrend,
        totalOrders,
        ordersTrend: lastMonthOrders > 0 ? thisMonthRevenue._count.id - lastMonthOrders : null,
        avgOrderValue: totalOrders > 0 ? Math.round(Number(totalRevenue._sum.total || 0) / totalOrders) : 0,
        totalCustomers,
        newCustomersLastMonth: lastMonthCustomers,
        totalExpenses: totalExpensesNum,
        netProfit: totalRevenueNum - totalExpensesNum,
      },
      revenueByCategory: Object.entries(catRevMap).map(([cat, value]) => ({ category: cat, value })),
      monthly: (monthlyData as unknown as any[]).map(([orderAgg, expenseAgg, batchAgg, date]) => {
        const revenue = Number(orderAgg._sum?.total || 0) + Number(batchAgg._sum?.depositAmount || 0);
        const expenses = Number(expenseAgg._sum?.amount || 0);
        return {
          month: (date as Date).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
          revenue, expenses, profit: revenue - expenses,
          orders: orderAgg._count?.id || 0,
        };
      }),
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        name: productMap[p.productId]?.name || 'Unknown',
        category: productMap[p.productId]?.category || '',
        totalQty: p._sum.quantity || 0,
        totalRevenue: Number(p._sum.subtotal || 0),
      })),
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch reports data' }, { status: 500 });
  }
}
