import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

function getDateRange(period: string): { start: Date; end: Date } {
  if (/^\d{4}-W\d{2}$/.test(period)) {
    const [year, week] = period.split('-W').map(Number);
    const jan4 = new Date(year, 0, 4);
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const start = new Date(startOfWeek1);
    start.setDate(startOfWeek1.getDate() + (week - 1) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { start, end };
  }
  const year = parseInt(period);
  return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
}

function currentPeriods() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const weekNum = Math.ceil(((now.getTime() - startOfWeek1.getTime()) / 86400000 + 1) / 7);
  const week = String(weekNum).padStart(2, '0');
  return {
    weekly: `${year}-W${week}`,
    monthly: `${year}-${month}`,
    yearly: `${year}`,
  };
}

async function calcActual(category: string, period: string): Promise<number> {
  const { start, end } = getDateRange(period);
  try {
    switch (category) {
      case 'EGG_PRODUCTION': {
        const r = await db.eggProduction.aggregate({
          where: { date: { gte: start, lt: end } },
          _sum: { collected: true },
        });
        return r._sum.collected || 0;
      }
      case 'REVENUE': {
        const r = await db.order.aggregate({
          where: { createdAt: { gte: start, lt: end }, status: { in: ['PAID', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'] } },
          _sum: { total: true },
        });
        return Number(r._sum.total || 0);
      }
      case 'ORDERS': {
        return await db.order.count({ where: { createdAt: { gte: start, lt: end } } });
      }
      case 'CHICK_COUNT': {
        const r = await db.batch.aggregate({
          where: { startDate: { gte: start, lt: end } },
          _sum: { quantity: true },
        });
        return r._sum.quantity || 0;
      }
      case 'MORTALITY_RATE': {
        const [mortality, batches] = await Promise.all([
          db.mortalityLog.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { count: true } }),
          db.batch.aggregate({ where: { status: 'ACTIVE' }, _sum: { currentCount: true } }),
        ]);
        const total = (batches._sum.currentCount || 0) + (mortality._sum.count || 0);
        return total > 0 ? parseFloat(((mortality._sum.count || 0) / total * 100).toFixed(2)) : 0;
      }
      case 'EXPENSES': {
        const r = await db.expense.aggregate({
          where: { date: { gte: start, lt: end } },
          _sum: { amount: true },
        });
        return Number(r._sum.amount || 0);
      }
      case 'FEED_USAGE': {
        const r = await db.feedLog.aggregate({
          where: { recordedDate: { gte: start, lt: end } },
          _sum: { quantityUsed: true },
        });
        return Number(r._sum.quantityUsed || 0);
      }
      default:
        return 0;
    }
  } catch {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const periods = currentPeriods();
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // WEEKLY, MONTHLY, YEARLY, or null (all)

    const periodFilter = type === 'WEEKLY' ? [periods.weekly]
      : type === 'MONTHLY' ? [periods.monthly]
      : type === 'YEARLY' ? [periods.yearly]
      : [periods.weekly, periods.monthly, periods.yearly];

    const goals = await db.goal.findMany({
      where: { period: { in: periodFilter } },
      orderBy: { createdAt: 'asc' },
    });

    const goalsWithProgress = await Promise.all(
      goals.map(async (goal: any) => {
        const actual = await calcActual(goal.category, goal.period);
        const target = Number(goal.target);
        const isLowerBetter = goal.category === 'MORTALITY_RATE' || goal.category === 'EXPENSES';
        const pct = target > 0
          ? isLowerBetter
            ? Math.max(0, Math.round((1 - actual / target) * 100))
            : Math.min(Math.round((actual / target) * 100), 999)
          : 0;
        return { ...goal, target, actual, progressPct: pct, isLowerBetter };
      })
    );

    return NextResponse.json({ data: goalsWithProgress, periods });
  } catch (error) {
    console.error('Goals fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, category, target, period, label, notes } = body;

    if (!type || !category || !target || !period) {
      return NextResponse.json({ error: 'type, category, target, period are required' }, { status: 400 });
    }

    const goal = await db.goal.upsert({
      where: { category_period: { category, period } },
      create: { type, category, target: parseFloat(String(target)), period, label: label || null, notes: notes || null },
      update: { target: parseFloat(String(target)), label: label || null, notes: notes || null },
    });

    return NextResponse.json({ message: 'Goal saved', goal }, { status: 201 });
  } catch (error: any) {
    console.error('Goal create error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save goal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { goalId } = await request.json();
    if (!goalId) return NextResponse.json({ error: 'goalId required' }, { status: 400 });

    await db.goal.delete({ where: { id: goalId } });
    return NextResponse.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error('Goal delete error:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
