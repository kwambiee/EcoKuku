import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

    const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const end = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);

    const [records, totalAgg, byCategory] = await Promise.all([
      db.income.findMany({
        where: { date: { gte: start, lt: end } },
        orderBy: { date: 'desc' },
        take: 200,
      }),
      db.income.aggregate({
        where: { date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      db.income.groupBy({
        by: ['category'],
        where: { date: { gte: start, lt: end } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      records: records.map((r) => ({ ...r, amount: Number(r.amount) })),
      total: Number(totalAgg._sum.amount || 0),
      byCategory: byCategory.map((c) => ({
        category: c.category,
        total: Number(c._sum.amount || 0),
        count: c._count,
      })),
    });
  } catch (error) {
    console.error('Income GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch income' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { category, description, amount, date, paymentMethod, buyerName, receiptRef, notes } = body;

    if (!category || !description || !amount) {
      return NextResponse.json({ error: 'category, description and amount are required' }, { status: 400 });
    }

    const record = await db.income.create({
      data: {
        category,
        description,
        amount: parseFloat(String(amount)),
        date: date ? new Date(date) : new Date(),
        paymentMethod: paymentMethod || null,
        buyerName: buyerName || null,
        receiptRef: receiptRef || null,
        notes: notes || null,
        sourceType: 'MANUAL',
      },
    });

    return NextResponse.json({ record: { ...record, amount: Number(record.amount) } }, { status: 201 });
  } catch (error: any) {
    console.error('Income POST error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save income' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { incomeId, category, description, amount, date, paymentMethod, buyerName, receiptRef, notes } = body;
    if (!incomeId) return NextResponse.json({ error: 'incomeId required' }, { status: 400 });

    const record = await db.income.update({
      where: { id: incomeId },
      data: {
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: parseFloat(String(amount)) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod || null }),
        ...(buyerName !== undefined && { buyerName: buyerName || null }),
        ...(receiptRef !== undefined && { receiptRef: receiptRef || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json({ record: { ...record, amount: Number(record.amount) } });
  } catch (error: any) {
    console.error('Income PATCH error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { incomeId } = await request.json();
    if (!incomeId) return NextResponse.json({ error: 'incomeId required' }, { status: 400 });

    await db.income.delete({ where: { id: incomeId } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Income DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
