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
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const skip = (page - 1) * limit;
    const where: any = {};
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [expenses, total, totalAmount] = await Promise.all([
      db.expense.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      db.expense.count({ where }),
      db.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return NextResponse.json({
      data: expenses,
      total: Number(totalAmount._sum.amount || 0),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
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
    const { date, category, description, amount, vendor, receiptRef, notes } = body;

    if (!category || !description || !amount) {
      return NextResponse.json({ error: 'category, description, and amount are required' }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        date: date ? new Date(date) : new Date(),
        category,
        description,
        amount: parseFloat(amount),
        vendor: vendor || null,
        receiptRef: receiptRef || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ message: 'Expense recorded', expense }, { status: 201 });
  } catch (error: any) {
    console.error('Expense creation error:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to record expense',
      detail: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { expenseId, date, category, description, amount, vendor, receiptRef, notes } = body;
    if (!expenseId) return NextResponse.json({ error: 'expenseId required' }, { status: 400 });

    const expense = await db.expense.update({
      where: { id: expenseId },
      data: {
        ...(date && { date: new Date(date) }),
        ...(category && { category }),
        ...(description && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(vendor !== undefined && { vendor: vendor || null }),
        ...(receiptRef !== undefined && { receiptRef: receiptRef || null }),
        ...(notes !== undefined && { notes: notes || null }),
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
