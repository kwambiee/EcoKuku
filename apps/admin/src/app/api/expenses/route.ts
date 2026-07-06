import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');
    const source = searchParams.get('source'); // 'auto' | 'manual'
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const where: any = {};
    if (category) where.category = category;
    if (source === 'auto') where.sourceType = { not: null };
    if (source === 'manual') where.sourceType = null;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); where.date.lte = d; }
    }

    const skip = (page - 1) * limit;

    const [expenses, totalCount, totalAmount, thisMonthAgg, lastMonthAgg, byCategoryThisMonth] = await Promise.all([
      db.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { batch: { select: { id: true, batchNumber: true, type: true } } },
      }),
      db.expense.count({ where }),
      db.expense.aggregate({ where, _sum: { amount: true } }),
      db.expense.aggregate({ where: { date: { gte: thisMonthStart } }, _sum: { amount: true } }),
      db.expense.aggregate({ where: { date: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amount: true } }),
      db.expense.groupBy({
        by: ['category'],
        where: { date: { gte: thisMonthStart } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    const thisMonthTotal = Number(thisMonthAgg._sum.amount || 0);
    const lastMonthTotal = Number(lastMonthAgg._sum.amount || 0);
    const pctChange = lastMonthTotal > 0
      ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : null;
    const largestCategory = byCategoryThisMonth[0] || null;

    return NextResponse.json({
      data: expenses,
      total: Number(totalAmount._sum.amount || 0),
      count: totalCount,
      pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
      stats: {
        thisMonthTotal,
        lastMonthTotal,
        pctChange,
        largestCategory: largestCategory ? { category: largestCategory.category, amount: Number(largestCategory._sum.amount || 0) } : null,
      },
      byCategoryThisMonth: byCategoryThisMonth.map((e) => ({ category: e.category, amount: Number(e._sum.amount || 0) })),
    });
  } catch (error) {
    console.error('Expenses fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { date, category, description, amount, paymentMethod, vendor, receiptRef, receiptImage, notes, batchId } = body;

    if (!category || !description || !amount) {
      return NextResponse.json({ error: 'category, description, and amount are required' }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        date: date ? new Date(date) : new Date(),
        category,
        description,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || null,
        vendor: vendor || null,
        receiptRef: receiptRef || null,
        receiptImage: receiptImage || null,
        notes: notes || null,
        batchId: batchId || null,
        sourceType: null,
      },
    });

    return NextResponse.json({ message: 'Expense recorded', expense }, { status: 201 });
  } catch (error: any) {
    console.error('Expense creation error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to record expense' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { expenseId, date, category, description, amount, paymentMethod, vendor, receiptRef, receiptImage, notes, batchId } = body;
    if (!expenseId) return NextResponse.json({ error: 'expenseId required' }, { status: 400 });

    const expense = await db.expense.update({
      where: { id: expenseId },
      data: {
        ...(date && { date: new Date(date) }),
        ...(category && { category }),
        ...(description && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod || null }),
        ...(vendor !== undefined && { vendor: vendor || null }),
        ...(receiptRef !== undefined && { receiptRef: receiptRef || null }),
        ...(receiptImage !== undefined && { receiptImage: receiptImage || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(batchId !== undefined && { batchId: batchId || null }),
      },
    });
    return NextResponse.json({ expense });
  } catch (error: any) {
    console.error('Expense update error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.expenseId) return NextResponse.json({ error: 'expenseId required' }, { status: 400 });

    await db.expense.delete({ where: { id: body.expenseId } });
    return NextResponse.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('Expense delete error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
