import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

const VACCINE_SCHEDULE = [
  { vaccine: "Marek's Disease", daysOld: 1 },
  { vaccine: 'Newcastle Disease (ND)', daysOld: 7 },
  { vaccine: 'Coccidiosis', daysOld: 7 },
  { vaccine: 'Infectious Bronchitis (IB)', daysOld: 10 },
  { vaccine: 'Gumboro (IBD)', daysOld: 14 },
  { vaccine: 'ND Booster', daysOld: 21 },
  { vaccine: 'Gumboro Booster', daysOld: 28 },
  { vaccine: 'Fowl Pox', daysOld: 42 },
];

async function getWeeklyGoals(weekStart: Date, now: Date) {
  try {
    const year = now.getFullYear();
    const jan4 = new Date(year, 0, 4);
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const weekNum = Math.ceil(((now.getTime() - startOfWeek1.getTime()) / 86400000 + 1) / 7);
    const period = `${year}-W${String(weekNum).padStart(2, '0')}`;
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

    const goals = await db.goal.findMany({ where: { type: 'WEEKLY', period } });
    if (goals.length === 0) return [];

    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - weekStart.getTime()) / 86400000));
    const daysRemaining = Math.max(0, 7 - daysElapsed);

    return Promise.all(goals.map(async (goal: any) => {
      let actual = 0;
      const target = Number(goal.target);

      try {
        if (goal.category === 'EGG_PRODUCTION') {
          const r = await db.eggProduction.aggregate({ where: { date: { gte: weekStart, lt: weekEnd } }, _sum: { collected: true } });
          actual = r._sum.collected || 0;
        } else if (goal.category === 'REVENUE') {
          const r = await db.order.aggregate({ where: { createdAt: { gte: weekStart, lt: weekEnd }, status: { in: ['PAID', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'] } }, _sum: { total: true } });
          actual = Number(r._sum.total || 0);
        } else if (goal.category === 'ORDERS') {
          actual = await db.order.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } });
        } else if (goal.category === 'CHICK_COUNT') {
          const r = await db.batch.aggregate({ where: { startDate: { gte: weekStart, lt: weekEnd } }, _sum: { quantity: true } });
          actual = r._sum.quantity || 0;
        } else if (goal.category === 'EXPENSES') {
          const r = await db.expense.aggregate({ where: { date: { gte: weekStart, lt: weekEnd } }, _sum: { amount: true } });
          actual = Number(r._sum.amount || 0);
        }
      } catch { actual = 0; }

      const isLowerBetter = goal.category === 'MORTALITY_RATE' || goal.category === 'EXPENSES';
      const progressPct = target > 0 ? Math.min(Math.round((actual / target) * 100), 999) : 0;
      const currentPace = daysElapsed > 0 ? Math.round(actual / daysElapsed) : 0;
      const neededPace = daysRemaining > 0 ? Math.round((target - actual) / daysRemaining) : 0;

      return {
        id: goal.id,
        category: goal.category,
        label: goal.label,
        target,
        actual,
        progressPct,
        isLowerBetter,
        currentPace,
        neededPace,
        daysRemaining,
      };
    }));
  } catch { return []; }
}

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
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay(); // 0=Sun, 1=Mon...
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0 back
    weekStart.setDate(weekStart.getDate() - daysBack);

    const [
      activeBatches,
      eggsToday,
      eggsYesterday,
      ordersToday,
      _ordersYesterday,
      ordersPending,
      ordersOutForDelivery,
      revenueToday,
      revenueYesterday,
      revenueThisMonth,
      revenueLastMonth,
      expensesThisMonth,
      recentOrders,
      lowStockProducts,
      _pendingBatchOrders,
      mortalityToday,
      outstandingPayments,
      feedTypes,
      recentFeedLogs,
      incubationBatches,
      vaccinations,
      unassignedDeliveries,
      eggsThisWeek,
      inventoryProducts,
      preOrders,
    ] = await Promise.all([
      db.batch.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, currentCount: true, quantity: true, batchNumber: true, type: true, startDate: true, breed: true, source: true, notes: true, acquisitionCost: true },
      }),
      db.eggProduction.aggregate({ where: { date: { gte: todayStart } }, _sum: { collected: true } }),
      db.eggProduction.aggregate({ where: { date: { gte: yesterdayStart, lt: todayStart } }, _sum: { collected: true } }),
      db.order.count({ where: { createdAt: { gte: todayStart } } }),
      db.order.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      db.order.count({ where: { status: 'PENDING' } }),
      db.order.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
      db.order.aggregate({ where: { createdAt: { gte: todayStart }, status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true } }),
      db.order.aggregate({ where: { createdAt: { gte: yesterdayStart, lt: todayStart }, status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true } }),
      db.order.aggregate({ where: { createdAt: { gte: monthStart }, status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true } }),
      db.order.aggregate({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: { notIn: ['CANCELLED', 'FAILED'] } }, _sum: { total: true } }),
      db.expense.aggregate({ where: { date: { gte: monthStart } }, _sum: { amount: true } }),
      db.order.findMany({
        where: { status: { notIn: ['DELIVERED', 'CANCELLED', 'FAILED'] } },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          items: { include: { product: { select: { name: true, type: true } } } },
        },
      }),
      db.product.findMany({
        where: { available: true, stock: { lt: 50 } },
        orderBy: { stock: 'asc' },
        take: 5,
        select: { id: true, name: true, stock: true, category: true },
      }),
      db.batchOrder.count({ where: { status: { in: ['PENDING_PAYMENT', 'CONFIRMED'] } } }),
      db.mortalityLog.aggregate({ where: { date: { gte: todayStart } }, _sum: { count: true } }),
      // Outstanding M-Pesa payments
      db.order.findMany({
        where: { status: 'PENDING' },
        select: { id: true, total: true },
      }),
      // Feed data
      db.feedType.findMany({ include: { stock: true }, orderBy: { name: 'asc' } }),
      db.feedLog.findMany({ where: { recordedDate: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { recordedDate: 'desc' } }),
      // Incubation batches hatching today or overdue
      db.incubationBatch.findMany({
        where: {
          hatchedCount: 0,
          failedCount: 0,
          expectedHatchDate: { lte: new Date(todayStart.getTime() + 86400000) },
        },
        orderBy: { expectedHatchDate: 'asc' },
      }),
      // All vaccinations for active batches
      db.vaccination.findMany({
        where: { batch: { status: 'ACTIVE' } },
        select: { vaccineType: true, batchId: true, dateAdministered: true },
      }),
      // Unassigned deliveries
      db.delivery.count({
        where: { driverId: null, status: { notIn: ['DELIVERED', 'RETURNED', 'FAILED'] } },
      }),
      // Eggs this week (daily breakdown)
      db.eggProduction.findMany({
        where: { date: { gte: weekStart } },
        select: { date: true, collected: true, broken: true, cracked: true },
      }),
      // Inventory snapshot
      db.product.findMany({
        where: { available: true, stock: { gt: 0 } },
        select: { name: true, stock: true, category: true, type: true },
      }),
      // Pre-orders (batch orders)
      db.batchOrder.findMany({
        where: { status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'GROWING'] } },
        include: {
          batch: { select: { batchNumber: true, type: true, expectedReady: true } },
          customer: { select: { name: true } },
        },
        orderBy: { expectedReadyDate: 'asc' },
        take: 10,
      }),
    ]);

    const totalBirds = activeBatches.reduce((sum, b) => sum + b.currentCount, 0);

    // ---- Build Alerts ----
    const alerts: { type: 'red' | 'amber' | 'blue'; title: string; detail: string; link?: string }[] = [];

    // Vaccination alerts
    for (const batch of activeBatches) {
      const ageInDays = Math.floor((Date.now() - new Date(batch.startDate).getTime()) / 86400000);
      const batchVaccinations = vaccinations.filter((v) => v.batchId === batch.id);

      for (const sched of VACCINE_SCHEDULE) {
        const isBooster = sched.vaccine.includes('Booster');
        const keywords = sched.vaccine.toUpperCase().split(' ')[0];
        const isLogged = batchVaccinations.some((v) => {
          const vt = v.vaccineType.toUpperCase();
          if (!vt.includes(keywords)) return false;
          if (isBooster) return vt.includes('BOOSTER') || vt.includes('2ND');
          return !vt.includes('BOOSTER');
        });

        if (isLogged) continue;

        const daysUntilDue = sched.daysOld - ageInDays;
        if (daysUntilDue < 0) {
          alerts.push({
            type: 'red',
            title: `${sched.vaccine} vaccination overdue`,
            detail: `${batch.batchNumber} (${batch.type}) · due day ${sched.daysOld} · ${Math.abs(daysUntilDue)} days late`,
            link: '/health',
          });
        } else if (daysUntilDue <= 3) {
          alerts.push({
            type: 'amber',
            title: `${sched.vaccine} due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}`,
            detail: `${batch.batchNumber} (${batch.type})`,
            link: '/health',
          });
        }
      }
    }

    // Feed alerts
    const feedInventory = feedTypes.map((ft) => {
      const stock = ft.stock.reduce((s, st) => s + Number(st.quantity), 0);
      const dailyLogs = recentFeedLogs.filter((l) => l.feedType === ft.name);
      const dailyAvg = dailyLogs.length > 0
        ? dailyLogs.reduce((s, l) => s + Number(l.quantityUsed), 0) / Math.min(7, dailyLogs.length)
        : 0;
      const daysRemaining = dailyAvg > 0 ? Math.floor(stock / dailyAvg) : null;
      return { name: ft.name, totalStock: stock, daysRemaining, isLow: daysRemaining !== null && daysRemaining < 7 };
    });

    for (const feed of feedInventory.filter((f) => f.isLow)) {
      alerts.push({
        type: feed.daysRemaining !== null && feed.daysRemaining <= 3 ? 'red' : 'amber',
        title: `Feed ${feed.daysRemaining !== null && feed.daysRemaining <= 3 ? 'critically' : 'running'} low`,
        detail: `${feed.name} · ${Math.round(feed.totalStock)} kg remaining${feed.daysRemaining !== null ? ` · ~${feed.daysRemaining} days` : ''}`,
        link: '/feed',
      });
    }

    // Unassigned deliveries
    if (unassignedDeliveries > 0) {
      alerts.push({
        type: 'amber',
        title: `${unassignedDeliveries} order${unassignedDeliveries > 1 ? 's' : ''} not yet assigned a driver`,
        detail: 'Deliveries pending assignment',
        link: '/logistics',
      });
    }

    // Incubation hatching
    for (const inc of incubationBatches) {
      const daysLeft = Math.ceil((new Date(inc.expectedHatchDate).getTime() - Date.now()) / 86400000);
      alerts.push({
        type: 'blue',
        title: `Incubation ${inc.batchNumber} ${daysLeft <= 0 ? 'hatching today' : `hatching in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`}`,
        detail: `Expected ${inc.eggCount} chicks · record results`,
        link: '/incubation',
      });
    }

    // Sort: red first, then amber, then blue
    const alertOrder = { red: 0, amber: 1, blue: 2 };
    alerts.sort((a, b) => alertOrder[a.type] - alertOrder[b.type]);

    // ---- Build Today's Tasks ----
    const tasks: { label: string; detail?: string; done: boolean; link?: string }[] = [];

    const eggsLoggedToday = (eggsToday._sum.collected || 0) > 0;
    tasks.push({ label: 'Log morning egg collection', done: eggsLoggedToday, link: '/eggs' });

    const feedLoggedToday = recentFeedLogs.some((l) => {
      const d = new Date(l.recordedDate);
      return d >= todayStart;
    });
    tasks.push({ label: 'Record feed consumption', done: feedLoggedToday, link: '/feed' });

    // Overdue vaccinations as tasks
    const overdueAlerts = alerts.filter((a) => a.type === 'red' && a.title.includes('vaccination'));
    for (const alert of overdueAlerts.slice(0, 2)) {
      tasks.push({ label: alert.title, detail: 'Overdue — do today', done: false, link: '/health' });
    }

    if (unassignedDeliveries > 0) {
      tasks.push({ label: `Assign drivers to ${unassignedDeliveries} deliveries`, detail: 'Before 10am', done: false, link: '/logistics' });
    }

    for (const inc of incubationBatches.slice(0, 1)) {
      const daysLeft = Math.ceil((new Date(inc.expectedHatchDate).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 0) {
        tasks.push({ label: `Record ${inc.batchNumber} hatch results`, detail: 'Move chicks to coop after counting', done: false, link: '/incubation' });
      }
    }

    for (const feed of feedInventory.filter((f) => f.isLow).slice(0, 1)) {
      tasks.push({ label: `Order ${feed.name} restock`, detail: `~${feed.daysRemaining} days remaining`, done: false, link: '/feed' });
    }

    // ---- Build Eggs This Week ----
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayDayIdx = (now.getDay() + 6) % 7; // Mon=0
    const weeklyEggs: { day: string; collected: number; good: number; isToday: boolean }[] = [];

    for (let i = 0; i <= Math.min(todayDayIdx, 6); i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const dayRecords = eggsThisWeek.filter((e) => {
        const d = new Date(e.date);
        return d >= dayStart && d < dayEnd;
      });
      const collected = dayRecords.reduce((s, r) => s + r.collected, 0);
      const damaged = dayRecords.reduce((s, r) => s + (r.broken || 0) + (r.cracked || 0), 0);

      weeklyEggs.push({
        day: daysOfWeek[i],
        collected,
        good: collected - damaged,
        isToday: i === todayDayIdx,
      });
    }

    const weekTotal = weeklyEggs.reduce((s, d) => s + d.good, 0);
    const weekCollected = weeklyEggs.reduce((s, d) => s + d.collected, 0);
    const dailyAvgEggs = weeklyEggs.length > 0 ? Math.round(weekCollected / weeklyEggs.length) : 0;
    const qualityRate = weekCollected > 0 ? ((weekTotal / weekCollected) * 100).toFixed(1) : '0';

    // ---- Build Active Batches Grouped by Type with Alerts ----
    const batchesWithAlerts = activeBatches.map((batch) => {
      const ageInDays = Math.floor((Date.now() - new Date(batch.startDate).getTime()) / 86400000);
      const ageWeeks = Math.floor(ageInDays / 7);
      const batchAlerts: string[] = [];

      const batchVacs = vaccinations.filter((v) => v.batchId === batch.id);
      for (const sched of VACCINE_SCHEDULE) {
        const isBooster = sched.vaccine.includes('Booster');
        const keywords = sched.vaccine.toUpperCase().split(' ')[0];
        const isLogged = batchVacs.some((v) => {
          const vt = v.vaccineType.toUpperCase();
          if (!vt.includes(keywords)) return false;
          if (isBooster) return vt.includes('BOOSTER') || vt.includes('2ND');
          return !vt.includes('BOOSTER');
        });

        if (!isLogged) {
          const daysUntilDue = sched.daysOld - ageInDays;
          if (daysUntilDue < 0) {
            batchAlerts.push(`${sched.vaccine.replace(' Disease', '').replace(' (IBD)', '').replace(' (ND)', '')} overdue`);
          } else if (daysUntilDue <= 3) {
            batchAlerts.push(`${sched.vaccine.replace(' Disease', '').replace(' (IBD)', '').replace(' (ND)', '')} due in ${daysUntilDue}d`);
          }
        }
      }

      return {
        id: batch.id,
        batchNumber: batch.batchNumber,
        type: batch.type,
        currentCount: batch.currentCount,
        ageWeeks,
        breed: batch.breed,
        source: batch.source,
        alerts: batchAlerts,
      };
    });

    // Group by type
    const batchesByType: Record<string, typeof batchesWithAlerts> = {};
    for (const b of batchesWithAlerts) {
      if (!batchesByType[b.type]) batchesByType[b.type] = [];
      batchesByType[b.type].push(b);
    }

    // ---- Monthly Revenue Summary ----
    const revThisMonth = Number(revenueThisMonth._sum.total || 0);
    const revLastMonth = Number(revenueLastMonth._sum.total || 0);
    const expThisMonth = Number(expensesThisMonth._sum.amount || 0);
    const monthlyTrend = revLastMonth > 0 ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100) : null;

    // ---- Inventory Snapshot ----
    const inventorySnapshot: { name: string; value: string; warning?: boolean }[] = [];
    const eggProducts = inventoryProducts.filter((p) => p.category === 'EGGS');
    const eggStock = eggProducts.reduce((s, p) => s + p.stock, 0);
    if (eggStock > 0) inventorySnapshot.push({ name: 'Good eggs in store', value: eggStock.toLocaleString() });

    const dressedProducts = inventoryProducts.filter((p) => p.type === 'CHICKEN_DRESSED');
    const dressedStock = dressedProducts.reduce((s, p) => s + p.stock, 0);
    if (dressedStock > 0) inventorySnapshot.push({ name: 'Dressed chicken', value: `${dressedStock}` });

    for (const feed of feedInventory) {
      if (feed.totalStock > 0) {
        inventorySnapshot.push({
          name: feed.name,
          value: `${Math.round(feed.totalStock)} kg`,
          warning: feed.isLow,
        });
      }
    }

    // ---- Pre-Orders ----
    const preOrderSummary = {
      count: preOrders.length,
      nextFulfilment: preOrders[0]?.expectedReadyDate
        ? new Date(preOrders[0].expectedReadyDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
        : null,
      items: preOrders.slice(0, 3).map((po) => ({
        description: `${po.quantity} ${po.batch?.type || 'chicks'} · ${po.customer?.name || 'Unknown'}`,
      })),
    };

    // ---- Outstanding Payments ----
    const outstandingTotal = outstandingPayments.reduce((s, o) => s + Number(o.total), 0);

    // ---- Cost of Production ----
    const eggsThisMonthAgg = await db.eggProduction.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { collected: true },
    });
    const eggsThisMonthNum = eggsThisMonthAgg._sum.collected || 0;

    // Cost per egg = total expenses this month / eggs collected this month
    const costPerEgg = eggsThisMonthNum > 0 && expThisMonth > 0
      ? Math.round((expThisMonth / eggsThisMonthNum) * 100) / 100
      : null;

    // Cost per live bird = total expenses this month / total active birds
    const costPerBirdMonth = totalBirds > 0 && expThisMonth > 0
      ? Math.round((expThisMonth / totalBirds) * 100) / 100
      : null;

    // Per-batch acquisition cost per chick
    const batchCostBreakdown = activeBatches
      .filter((b: any) => b.acquisitionCost)
      .map((b: any) => ({
        batchNumber: b.batchNumber,
        costPerChick: b.quantity > 0 ? Math.round((Number(b.acquisitionCost) / b.quantity) * 100) / 100 : null,
        totalAcquisitionCost: Number(b.acquisitionCost),
        initialCount: b.quantity,
        currentCount: b.currentCount,
      }));

    // ---- Build Response ----
    const eggsTodayNum = eggsToday._sum.collected || 0;
    const eggsYesterdayNum = eggsYesterday._sum.collected || 0;
    const revTodayNum = Number(revenueToday._sum.total || 0);
    const revYesterdayNum = Number(revenueYesterday._sum.total || 0);

    return NextResponse.json({
      greeting: {
        name: session.user.name || 'Farmer',
        date: now.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      },
      metrics: {
        revenueToday: revTodayNum,
        revenueTrend: revYesterdayNum > 0 ? Math.round(((revTodayNum - revYesterdayNum) / revYesterdayNum) * 100) : null,
        ordersToday,
        ordersPending,
        ordersOutForDelivery,
        eggsToday: eggsTodayNum,
        eggsDiff: eggsYesterdayNum > 0 ? eggsTodayNum - eggsYesterdayNum : null,
        totalBirds,
        activeBatchCount: activeBatches.length,
        mortalityToday: mortalityToday._sum.count || 0,
        feedStock: feedInventory.reduce((s, f) => s + f.totalStock, 0),
        feedLowestDays: feedInventory.reduce((min: number | null, f) => {
          if (f.daysRemaining === null) return min;
          if (min === null) return f.daysRemaining;
          return Math.min(min, f.daysRemaining);
        }, null as number | null),
        feedIsLow: feedInventory.some((f) => f.isLow),
        outstandingPayments: outstandingTotal,
        outstandingCount: outstandingPayments.length,
      },
      alerts,
      tasks,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        customerName: o.customer.name,
        itemSummary: o.items.length > 0
          ? `${o.items[0].product.name}${o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}`
          : '',
        deliveryArea: (o as any).deliveryArea || '',
      })),
      eggsThisWeek: {
        days: weeklyEggs,
        weekTotal,
        dailyAvg: dailyAvgEggs,
        qualityRate,
      },
      batchesByType,
      monthSummary: {
        revenue: revThisMonth,
        expenses: expThisMonth,
        netProfit: revThisMonth - expThisMonth,
        trend: monthlyTrend,
      },
      inventorySnapshot: inventorySnapshot.slice(0, 5),
      preOrders: preOrderSummary,
      lowStockProducts,
      weeklyGoals: await getWeeklyGoals(weekStart, now),
      costOfProduction: {
        costPerEgg,
        costPerBirdMonth,
        eggsThisMonth: eggsThisMonthNum,
        expensesThisMonth: expThisMonth,
        totalActiveBirds: totalBirds,
        batchCostBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
