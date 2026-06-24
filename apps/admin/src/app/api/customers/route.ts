import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

function getSegment(totalSpent: number, orderCount: number, lastOrderDate: Date | null): string {
  if (!lastOrderDate || orderCount === 0) return 'NEW';
  const daysSinceLastOrder = Math.floor((Date.now() - lastOrderDate.getTime()) / 86400000);
  if (daysSinceLastOrder >= 60) return 'LAPSED';
  if (daysSinceLastOrder >= 30) return 'AT_RISK';
  if (orderCount >= 5 || totalSpent >= 10000) return 'VIP';
  if (orderCount >= 2) return 'REPEAT';
  return 'NEW';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '200');
    const search = searchParams.get('search');
    const segment = searchParams.get('segment');

    const where: any = { role: 'CUSTOMER' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.user.findMany({
        where, take: limit,
        select: {
          id: true, name: true, email: true, phone: true,
          customerType: true, location: true, adminNotes: true,
          referralCode: true, referredby: true,
          createdAt: true,
          orders: {
            select: { id: true, total: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let newThisMonth = 0;
    let repeatThisMonth = 0;
    let withBalance = 0;
    const enriched = customers.map((c: any) => {
      const totalSpent = c.orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      const orderCount = c.orders.length;
      const lastOrder = c.orders[0] || null;
      const lastOrderDate = lastOrder ? new Date(lastOrder.createdAt) : null;
      const seg = getSegment(totalSpent, orderCount, lastOrderDate);

      if (new Date(c.createdAt) >= monthStart) newThisMonth++;
      const monthOrders = c.orders.filter((o: any) => new Date(o.createdAt) >= monthStart);
      if (monthOrders.length >= 2) repeatThisMonth++;

      const pendingBalance = c.orders
        .filter((o: any) => ['PENDING', 'CONFIRMED'].includes(o.status))
        .reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      if (pendingBalance > 0) withBalance++;

      return {
        ...c,
        totalSpent,
        orderCount,
        lastOrderDate: lastOrderDate?.toISOString() || null,
        segment: seg,
        pendingBalance,
      };
    });

    const filtered = segment
      ? enriched.filter((c: any) => c.segment === segment)
      : enriched;

    return NextResponse.json({
      data: filtered,
      pagination: { total, pages: 1 },
      stats: {
        totalCustomers: total,
        newThisMonth,
        repeatThisMonth,
        repeatPct: total > 0 ? Math.round((repeatThisMonth / total) * 100) : 0,
        withBalance,
      },
      segments: {
        VIP: enriched.filter((c: any) => c.segment === 'VIP').length,
        REPEAT: enriched.filter((c: any) => c.segment === 'REPEAT').length,
        AT_RISK: enriched.filter((c: any) => c.segment === 'AT_RISK').length,
        LAPSED: enriched.filter((c: any) => c.segment === 'LAPSED').length,
        NEW: enriched.filter((c: any) => c.segment === 'NEW').length,
      },
    });
  } catch (error) {
    console.error('Customers fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { customerId, customerType, location, adminNotes } = body;
    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 });

    const updateData: any = {};
    if (customerType !== undefined) updateData.customerType = customerType;
    if (location !== undefined) updateData.location = location;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const customer = await db.user.update({ where: { id: customerId }, data: updateData });
    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Customer update error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
