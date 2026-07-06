import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));

    const budget = await db.monthlyBudget.findUnique({ where: { month_year: { month, year } } });
    return NextResponse.json({ budget });
  } catch (error) {
    console.error('Budget fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch budget' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { amount, month, year } = body;
    if (!amount || isNaN(parseFloat(amount))) return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });

    const now = new Date();
    const m = parseInt(month || String(now.getMonth() + 1));
    const y = parseInt(year || String(now.getFullYear()));

    const budget = await db.monthlyBudget.upsert({
      where: { month_year: { month: m, year: y } },
      create: { month: m, year: y, amount: parseFloat(amount) },
      update: { amount: parseFloat(amount) },
    });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error('Budget save error:', error);
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const now = new Date();
    const month = parseInt(body.month || String(now.getMonth() + 1));
    const year = parseInt(body.year || String(now.getFullYear()));

    await db.monthlyBudget.delete({ where: { month_year: { month, year } } }).catch(() => {});
    return NextResponse.json({ message: 'Budget cleared' });
  } catch (error) {
    console.error('Budget delete error:', error);
    return NextResponse.json({ error: 'Failed to clear budget' }, { status: 500 });
  }
}
