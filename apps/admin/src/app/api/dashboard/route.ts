import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

// ── Vaccination schedule — kept in sync with apps/admin/src/app/health/page.tsx
const VACCINE_SCHEDULE = [
  { vaccine: "Marek's Disease",           daysOld: 1,  windowEnd: 3  },
  { vaccine: 'Newcastle Disease + IB',    daysOld: 7,  windowEnd: 14 },
  { vaccine: 'Gumboro (IBD)',             daysOld: 14, windowEnd: 21 },
  { vaccine: 'Newcastle Disease (plain)', daysOld: 21, windowEnd: 28 },
  { vaccine: 'Gumboro Booster',           daysOld: 28, windowEnd: 35 },
  { vaccine: 'Fowl Pox',                  daysOld: 42, windowEnd: 70 },
  { vaccine: 'Fowl Typhoid',              daysOld: 56, windowEnd: 84 },
];

/** Returns true if a logged vaccineType string matches a schedule entry */
function isVaccineLogged(scheduleVaccine: string, loggedType: string): boolean {
  const l = loggedType.toUpperCase().trim();
  const s = scheduleVaccine.toUpperCase().trim();
  if (l === s) return true;
  switch (scheduleVaccine) {
    case "Marek's Disease":
      return l.includes('MAREK');
    case 'Newcastle Disease + IB':
      return (l.includes('NEWCASTLE') || l.startsWith('ND ') || l === 'ND')
        && (l.includes('+ IB') || l.includes('+IB') || l.includes('BRONCHITIS') || l.includes('IB'))
        && !l.includes('PLAIN') && !l.includes('BOOST');
    case 'Gumboro (IBD)':
      return (l.includes('GUMBORO') || l.includes('IBD')) && !l.includes('BOOST') && !l.includes('2ND') && !l.includes('SECOND');
    case 'Newcastle Disease (plain)':
      return (l.includes('NEWCASTLE') || l.includes('ND')) && (l.includes('PLAIN') || l.includes('BOOST')) && !l.includes('IB');
    case 'Gumboro Booster':
      return (l.includes('GUMBORO') || l.includes('IBD')) && (l.includes('BOOST') || l.includes('2ND') || l.includes('SECOND'));
    case 'Fowl Pox':
      return l.includes('POX') || l.includes('FOWLPOX');
    case 'Fowl Typhoid':
      return l.includes('TYPHOID') || l.includes('SALMONELLA') || l.includes('FOWL TYPHOID');
    default:
      return l.includes(scheduleVaccine.toUpperCase().split(' ')[0]);
  }
}

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

      return { id: goal.id, category: goal.category, label: goal.label, target, actual, progressPct, isLowerBetter, currentPace, neededPace, daysRemaining };
    }));
  } catch { return []; }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const weekStart = new Date(todayStart);
    const dayOfWeek = weekStart.getDay();
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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
      todayFeedLogs,
      todayEggLogs,
      yesterdayFeedLogs,
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
      db.order.findMany({ where: { status: 'PENDING' }, select: { id: true, total: true } }),
      db.feedType.findMany({ include: { stock: true }, orderBy: { name: 'asc' } }),
      db.feedLog.findMany({ where: { recordedDate: { gte: new Date(Date.now() - 7 * 86400000) } }, orderBy: { recordedDate: 'desc' } }),
      db.incubationBatch.findMany({
        where: { hatchedCount: 0, failedCount: 0, expectedHatchDate: { lte: new Date(todayStart.getTime() + 86400000) } },
        orderBy: { expectedHatchDate: 'asc' },
      }),
      db.vaccination.findMany({
        where: { batch: { status: 'ACTIVE' } },
        select: { vaccineType: true, batchId: true, dateAdministered: true },
      }),
      db.delivery.count({ where: { driverId: null, status: { notIn: ['DELIVERED', 'RETURNED', 'FAILED'] } } }),
      db.eggProduction.findMany({ where: { date: { gte: weekStart } }, select: { date: true, collected: true, broken: true, cracked: true } }),
      db.product.findMany({ where: { available: true, stock: { gt: 0 } }, select: { name: true, stock: true, category: true, type: true } }),
      db.batchOrder.findMany({
        where: { status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'GROWING'] } },
        include: { batch: { select: { batchNumber: true, type: true, expectedReady: true } }, customer: { select: { name: true } } },
        orderBy: { expectedReadyDate: 'asc' },
        take: 10,
      }),
      // Per-batch feed logs for today
      db.feedLog.findMany({
        where: { recordedDate: { gte: todayStart } },
        select: { batchId: true, feedType: true, quantityUsed: true },
      }),
      // Per-batch egg logs for today
      db.eggProduction.findMany({
        where: { date: { gte: todayStart } },
        select: { batchId: true, collected: true },
      }),
      // Yesterday's feed logs (carry-over detection)
      db.feedLog.findMany({
        where: { recordedDate: { gte: yesterdayStart, lt: todayStart } },
        select: { batchId: true },
      }),
    ]);

    const totalBirds = activeBatches.reduce((sum, b) => sum + b.currentCount, 0);

    // ── Feed inventory ──────────────────────────────────────────────────────────
    const feedInventory = feedTypes.map((ft) => {
      const stock = ft.stock.reduce((s, st) => s + Number(st.quantity), 0);
      const dailyLogs = recentFeedLogs.filter((l) => l.feedType === ft.name);
      const dailyAvg = dailyLogs.length > 0
        ? dailyLogs.reduce((s, l) => s + Number(l.quantityUsed), 0) / Math.min(7, dailyLogs.length)
        : 0;
      const daysRemaining = dailyAvg > 0 ? Math.floor(stock / dailyAvg) : null;
      // isLow drives the metric card amber warning (< 7 days)
      return { name: ft.name, totalStock: stock, daysRemaining, isLow: daysRemaining !== null && daysRemaining < 7 };
    });

    // ── Alerts ─────────────────────────────────────────────────────────────────
    const alerts: { type: 'red' | 'amber' | 'blue'; title: string; detail: string; link?: string }[] = [];

    // Vaccination alerts: warn 3 days before, flag overdue
    for (const batch of activeBatches) {
      const ageInDays = Math.floor((Date.now() - new Date(batch.startDate).getTime()) / 86400000);
      const batchVaccinations = vaccinations.filter((v) => v.batchId === batch.id);

      for (const sched of VACCINE_SCHEDULE) {
        const isLogged = batchVaccinations.some((v) => isVaccineLogged(sched.vaccine, v.vaccineType));
        if (isLogged) continue;

        const daysUntilDue = sched.daysOld - ageInDays;
        if (daysUntilDue < 0 && ageInDays <= sched.windowEnd) {
          // Within the grace window — amber "getting late"
          alerts.push({
            type: 'amber',
            title: `${sched.vaccine} — administer now`,
            detail: `${batch.batchNumber} (${batch.type}) · due day ${sched.daysOld} · day ${ageInDays} today`,
            link: '/health',
          });
        } else if (daysUntilDue < 0 && ageInDays > sched.windowEnd) {
          // Past the window — overdue
          alerts.push({
            type: 'red',
            title: `${sched.vaccine} vaccination overdue`,
            detail: `${batch.batchNumber} (${batch.type}) · due day ${sched.daysOld} · ${Math.abs(daysUntilDue)} days late`,
            link: '/health',
          });
        } else if (daysUntilDue === 0) {
          alerts.push({
            type: 'amber',
            title: `${sched.vaccine} due today`,
            detail: `${batch.batchNumber} (${batch.type}) · day ${sched.daysOld}`,
            link: '/health',
          });
        } else if (daysUntilDue <= 3) {
          // 3-day advance warning
          alerts.push({
            type: 'amber',
            title: `${sched.vaccine} due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
            detail: `${batch.batchNumber} (${batch.type}) · on day ${sched.daysOld}`,
            link: '/health',
          });
        }
      }
    }

    // Feed alerts: only fire when ≤ 2 days of stock remain (critical)
    for (const feed of feedInventory) {
      if (feed.daysRemaining === null) continue;
      if (feed.daysRemaining <= 2) {
        alerts.push({
          type: 'red',
          title: `Feed critically low — ${feed.daysRemaining <= 1 ? 'less than 1 day' : '~2 days'} remaining`,
          detail: `${feed.name} · ${Math.round(feed.totalStock)} kg left — reorder immediately`,
          link: '/feed',
        });
      } else if (feed.daysRemaining <= 5) {
        alerts.push({
          type: 'amber',
          title: `${feed.name} running low`,
          detail: `~${feed.daysRemaining} days of stock remaining — plan to reorder`,
          link: '/feed',
        });
      }
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

    const alertOrder = { red: 0, amber: 1, blue: 2 };
    alerts.sort((a, b) => alertOrder[a.type] - alertOrder[b.type]);

    // ── Today's tasks ──────────────────────────────────────────────────────────
    type BatchRow = { batchNumber: string; batchType: string; detail: string; done: boolean };
    const tasks: {
      label: string; detail?: string; done: boolean; link?: string;
      taskType?: string; batches?: BatchRow[];
    }[] = [];

    // 1. Feed task — per batch
    const feedBatchRows: BatchRow[] = activeBatches.map((batch) => {
      const logs = todayFeedLogs.filter((l) => l.batchId === batch.id);
      const totalKg = logs.reduce((s, l) => s + Number(l.quantityUsed), 0);
      return {
        batchNumber: batch.batchNumber,
        batchType: batch.type,
        detail: totalKg > 0 ? `${totalKg} kg logged` : 'Not logged yet',
        done: totalKg > 0,
      };
    });
    const feedAllDone = feedBatchRows.length === 0 || feedBatchRows.every((b) => b.done);
    const feedPendingCount = feedBatchRows.filter((b) => !b.done).length;
    tasks.push({
      label: 'Record feed consumption',
      detail: feedAllDone
        ? 'All batches logged ✓'
        : `${feedPendingCount} batch${feedPendingCount > 1 ? 'es' : ''} not yet logged`,
      done: feedAllDone,
      link: '/feed',
      taskType: 'feed',
      batches: feedBatchRows,
    });

    // 2. Egg collection task — only LAYER / KIENYEJI / MIXED batches
    const layerBatches = activeBatches.filter((b) =>
      b.type === 'LAYER' || b.type === 'KIENYEJI' || b.type === 'MIXED'
    );
    if (layerBatches.length > 0) {
      const eggBatchRows: BatchRow[] = layerBatches.map((batch) => {
        const logs = todayEggLogs.filter((l) => l.batchId === batch.id);
        const total = logs.reduce((s, l) => s + l.collected, 0);
        return {
          batchNumber: batch.batchNumber,
          batchType: batch.type,
          detail: total > 0 ? `${total} eggs logged` : 'Not logged yet',
          done: total > 0,
        };
      });
      const eggsAllDone = eggBatchRows.every((b) => b.done);
      const eggsPendingCount = eggBatchRows.filter((b) => !b.done).length;
      tasks.push({
        label: 'Log egg collection',
        detail: eggsAllDone
          ? 'All batches logged ✓'
          : `${eggsPendingCount} batch${eggsPendingCount > 1 ? 'es' : ''} pending`,
        done: eggsAllDone,
        link: '/eggs',
        taskType: 'eggs',
        batches: eggBatchRows,
      });
    }

    // 3. Vaccinations due today
    for (const batch of activeBatches) {
      const ageInDays = Math.floor((Date.now() - new Date(batch.startDate).getTime()) / 86400000);
      const batchVacs = vaccinations.filter((v) => v.batchId === batch.id);
      for (const sched of VACCINE_SCHEDULE) {
        const isLogged = batchVacs.some((v) => isVaccineLogged(sched.vaccine, v.vaccineType));
        if (isLogged) continue;
        const daysUntilDue = sched.daysOld - ageInDays;
        if (daysUntilDue === 0) {
          tasks.push({
            label: `Vaccinate ${batch.batchNumber} — ${sched.vaccine}`,
            detail: `Due today (day ${sched.daysOld})`,
            done: false,
            link: '/health',
            taskType: 'vaccination',
          });
        } else if (daysUntilDue < 0 && ageInDays <= sched.windowEnd) {
          tasks.push({
            label: `Vaccinate ${batch.batchNumber} — ${sched.vaccine}`,
            detail: `In window · administer before day ${sched.windowEnd}`,
            done: false,
            link: '/health',
            taskType: 'vaccination',
          });
        }
      }
    }

    // 4. Unassigned deliveries
    if (unassignedDeliveries > 0) {
      tasks.push({
        label: `Assign drivers to ${unassignedDeliveries} deliver${unassignedDeliveries > 1 ? 'ies' : 'y'}`,
        detail: 'Before 10am',
        done: false,
        link: '/logistics',
        taskType: 'logistics',
      });
    }

    // 5. Incubation hatch results
    for (const inc of incubationBatches.slice(0, 1)) {
      const daysLeft = Math.ceil((new Date(inc.expectedHatchDate).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 0) {
        tasks.push({
          label: `Record ${inc.batchNumber} hatch results`,
          detail: 'Move chicks to coop after counting',
          done: false,
          link: '/incubation',
          taskType: 'incubation',
        });
      }
    }

    // ── Carry-over: yesterday's undone system tasks ─────────────────────────────
    type CarryOver = { label: string; detail: string; link?: string };
    const carriedOver: CarryOver[] = [];

    const eggsYesterdayNum = eggsYesterday._sum.collected || 0;
    if (layerBatches.length > 0 && eggsYesterdayNum === 0) {
      carriedOver.push({
        label: 'Egg collection was not logged yesterday',
        detail: 'Consider logging it as a late entry',
        link: '/eggs',
      });
    }
    if (activeBatches.length > 0 && yesterdayFeedLogs.length === 0) {
      carriedOver.push({
        label: 'Feed consumption was not recorded yesterday',
        detail: 'Consider logging it as a late entry',
        link: '/feed',
      });
    }

    // ── Eggs this week ─────────────────────────────────────────────────────────
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayDayIdx = (now.getDay() + 6) % 7;
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
      weeklyEggs.push({ day: daysOfWeek[i], collected, good: collected - damaged, isToday: i === todayDayIdx });
    }

    const weekTotal = weeklyEggs.reduce((s, d) => s + d.good, 0);
    const weekCollected = weeklyEggs.reduce((s, d) => s + d.collected, 0);
    const dailyAvgEggs = weeklyEggs.length > 0 ? Math.round(weekCollected / weeklyEggs.length) : 0;
    const qualityRate = weekCollected > 0 ? ((weekTotal / weekCollected) * 100).toFixed(1) : '0';

    // ── Active batches with vaccination alerts ──────────────────────────────────
    const batchesWithAlerts = activeBatches.map((batch) => {
      const ageInDays = Math.floor((Date.now() - new Date(batch.startDate).getTime()) / 86400000);
      const ageWeeks = Math.floor(ageInDays / 7);
      const batchAlerts: string[] = [];
      const batchVacs = vaccinations.filter((v) => v.batchId === batch.id);

      for (const sched of VACCINE_SCHEDULE) {
        const isLogged = batchVacs.some((v) => isVaccineLogged(sched.vaccine, v.vaccineType));
        if (!isLogged) {
          const daysUntilDue = sched.daysOld - ageInDays;
          if (daysUntilDue < 0 && ageInDays > sched.windowEnd) {
            batchAlerts.push(`${sched.vaccine.split(' ')[0]} overdue`);
          } else if (daysUntilDue <= 3 && daysUntilDue >= 0) {
            batchAlerts.push(`${sched.vaccine.split(' ')[0]} in ${daysUntilDue}d`);
          }
        }
      }

      return { id: batch.id, batchNumber: batch.batchNumber, type: batch.type, currentCount: batch.currentCount, ageWeeks, breed: batch.breed, alerts: batchAlerts };
    });

    const batchesByType: Record<string, typeof batchesWithAlerts> = {};
    for (const b of batchesWithAlerts) {
      if (!batchesByType[b.type]) batchesByType[b.type] = [];
      batchesByType[b.type].push(b);
    }

    // ── Monthly revenue summary ─────────────────────────────────────────────────
    const [incomeThisMonth, incomeLastMonth, batchDepositsThisMonth, batchDepositsLastMonth] = await Promise.all([
      db.income.aggregate({ where: { date: { gte: monthStart } }, _sum: { amount: true } }),
      db.income.aggregate({ where: { date: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amount: true } }),
      db.batchOrder.aggregate({ where: { createdAt: { gte: monthStart }, depositPaid: true }, _sum: { depositAmount: true } }),
      db.batchOrder.aggregate({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, depositPaid: true }, _sum: { depositAmount: true } }),
    ]);

    const revThisMonth = Number(revenueThisMonth._sum.total || 0) + Number(incomeThisMonth._sum.amount || 0) + Number(batchDepositsThisMonth._sum.depositAmount || 0);
    const revLastMonth = Number(revenueLastMonth._sum.total || 0) + Number(incomeLastMonth._sum.amount || 0) + Number(batchDepositsLastMonth._sum.depositAmount || 0);
    const expThisMonth = Number(expensesThisMonth._sum.amount || 0);
    const monthlyTrend = revLastMonth > 0 ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100) : null;

    // ── Inventory snapshot ──────────────────────────────────────────────────────
    const inventorySnapshot: { name: string; value: string; warning?: boolean }[] = [];
    const eggStock = inventoryProducts.filter((p) => p.category === 'EGGS').reduce((s, p) => s + p.stock, 0);
    if (eggStock > 0) inventorySnapshot.push({ name: 'Good eggs in store', value: eggStock.toLocaleString() });
    const dressedStock = inventoryProducts.filter((p) => p.type === 'CHICKEN_DRESSED').reduce((s, p) => s + p.stock, 0);
    if (dressedStock > 0) inventorySnapshot.push({ name: 'Dressed chicken', value: `${dressedStock}` });
    for (const feed of feedInventory) {
      if (feed.totalStock > 0) inventorySnapshot.push({ name: feed.name, value: `${Math.round(feed.totalStock)} kg`, warning: feed.isLow });
    }

    // ── Pre-orders ──────────────────────────────────────────────────────────────
    const preOrderSummary = {
      count: preOrders.length,
      nextFulfilment: preOrders[0]?.expectedReadyDate
        ? new Date(preOrders[0].expectedReadyDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
        : null,
      items: preOrders.slice(0, 3).map((po) => ({ description: `${po.quantity} ${po.batch?.type || 'chicks'} · ${po.customer?.name || 'Unknown'}` })),
    };

    // ── Outstanding payments ─────────────────────────────────────────────────────
    const outstandingTotal = outstandingPayments.reduce((s, o) => s + Number(o.total), 0);

    // ── Cost of production ───────────────────────────────────────────────────────
    const eggsThisMonthAgg = await db.eggProduction.aggregate({ where: { date: { gte: monthStart } }, _sum: { collected: true } });
    const eggsThisMonthNum = eggsThisMonthAgg._sum.collected || 0;
    const costPerEgg = eggsThisMonthNum > 0 && expThisMonth > 0 ? Math.round((expThisMonth / eggsThisMonthNum) * 100) / 100 : null;
    const costPerBirdMonth = totalBirds > 0 && expThisMonth > 0 ? Math.round((expThisMonth / totalBirds) * 100) / 100 : null;
    const batchCostBreakdown = activeBatches
      .filter((b: any) => b.acquisitionCost)
      .map((b: any) => ({
        batchNumber: b.batchNumber,
        costPerChick: b.quantity > 0 ? Math.round((Number(b.acquisitionCost) / b.quantity) * 100) / 100 : null,
        totalAcquisitionCost: Number(b.acquisitionCost),
        initialCount: b.quantity,
        currentCount: b.currentCount,
      }));

    // ── Today's revenue ──────────────────────────────────────────────────────────
    const [incomeTodayAgg, incomeYesterdayAgg] = await Promise.all([
      db.income.aggregate({ where: { date: { gte: todayStart } }, _sum: { amount: true } }),
      db.income.aggregate({ where: { date: { gte: yesterdayStart, lt: todayStart } }, _sum: { amount: true } }),
    ]);
    const revTodayNum = Number(revenueToday._sum.total || 0) + Number(incomeTodayAgg._sum.amount || 0);
    const revYesterdayNum = Number(revenueYesterday._sum.total || 0) + Number(incomeYesterdayAgg._sum.amount || 0);
    const eggsTodayNum = eggsToday._sum.collected || 0;
    const eggsYesterdayNum2 = eggsYesterday._sum.collected || 0;

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
        eggsDiff: eggsYesterdayNum2 > 0 ? eggsTodayNum - eggsYesterdayNum2 : null,
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
      carriedOver,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        customerName: o.customer.name,
        itemSummary: o.items.length > 0 ? `${o.items[0].product.name}${o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}` : '',
        deliveryArea: (o as any).deliveryArea || '',
      })),
      eggsThisWeek: { days: weeklyEggs, weekTotal, dailyAvg: dailyAvgEggs, qualityRate },
      batchesByType,
      monthSummary: { revenue: revThisMonth, expenses: expThisMonth, netProfit: revThisMonth - expThisMonth, trend: monthlyTrend },
      inventorySnapshot: inventorySnapshot.slice(0, 5),
      preOrders: preOrderSummary,
      lowStockProducts,
      weeklyGoals: await getWeeklyGoals(weekStart, now),
      costOfProduction: { costPerEgg, costPerBirdMonth, eggsThisMonth: eggsThisMonthNum, expensesThisMonth: expThisMonth, totalActiveBirds: totalBirds, batchCostBreakdown },
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
