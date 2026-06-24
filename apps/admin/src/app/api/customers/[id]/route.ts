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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customer = await db.user.findFirst({
      where: { id: params.id, role: 'CUSTOMER' },
      select: {
        id: true, name: true, email: true, phone: true,
        customerType: true, location: true, adminNotes: true,
        referralCode: true, referredby: true,
        createdAt: true,
        addresses: { select: { area: true, street: true, landmark: true, isDefault: true } },
        orders: {
          select: {
            id: true, orderNumber: true, total: true, subtotal: true,
            deliveryFee: true, discountAmount: true,
            status: true, paymentMethod: true, paymentRef: true,
            createdAt: true, deliveryArea: true,
            items: {
              select: {
                id: true, quantity: true, price: true, subtotal: true,
                product: { select: { id: true, name: true, image: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          select: {
            id: true, rating: true, comment: true, createdAt: true,
            product: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        batchOrders: {
          select: {
            id: true, orderNumber: true, quantity: true, pricePerChick: true,
            totalPrice: true, depositAmount: true, depositPaid: true,
            status: true, createdAt: true,
            batch: { select: { id: true, batchNumber: true, type: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const totalSpent = customer.orders.reduce((s, o) => s + Number(o.total || 0), 0);
    const orderCount = customer.orders.length;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
    const lastOrderDate = orderCount > 0 ? new Date(customer.orders[0].createdAt) : null;

    const productMap: Record<string, { productId: string; productName: string; totalQuantity: number }> = {};
    for (const order of customer.orders) {
      for (const item of order.items) {
        const pid = item.product.id;
        if (!productMap[pid]) productMap[pid] = { productId: pid, productName: item.product.name, totalQuantity: 0 };
        productMap[pid].totalQuantity += item.quantity;
      }
    }
    const mostOrderedProducts = Object.values(productMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5);

    const segment = getSegment(totalSpent, orderCount, lastOrderDate);

    // Count referrals made
    const referralsMade = customer.referralCode
      ? await db.user.count({ where: { referredby: customer.referralCode } })
      : 0;

    // Promos used
    const promosUsed = await db.order.findMany({
      where: { customerId: customer.id, promoId: { not: null } },
      select: { promo: { select: { code: true, discountType: true, discountValue: true } }, discountAmount: true },
    });

    const pendingBalance = customer.orders
      .filter((o) => ['PENDING', 'CONFIRMED'].includes(o.status))
      .reduce((s, o) => s + Number(o.total || 0), 0);

    return NextResponse.json({
      data: {
        ...customer,
        stats: { totalSpent, orderCount, avgOrderValue, lastOrderDate: lastOrderDate?.toISOString() || null },
        mostOrderedProducts,
        segment,
        referralsMade,
        promosUsed: promosUsed.map((p) => ({
          code: p.promo?.code, discountType: p.promo?.discountType,
          discountValue: Number(p.promo?.discountValue || 0), discountAmount: Number(p.discountAmount),
        })),
        pendingBalance,
      },
    });
  } catch (error) {
    console.error('Customer detail fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer details' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { customerType, location, adminNotes } = body;
    const updateData: any = {};
    if (customerType !== undefined) updateData.customerType = customerType;
    if (location !== undefined) updateData.location = location;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const customer = await db.user.update({ where: { id: params.id }, data: updateData });
    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Customer update error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
