import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

function getCustomerTier(totalSpent: number, orderCount: number) {
  if (totalSpent >= 50000 || orderCount >= 10) return 'Gold';
  if (totalSpent >= 25000 || orderCount >= 5) return 'Silver';
  return 'Regular';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(adminAuthOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = params;

    const customer = await db.user.findFirst({
      where: {
        id,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                price: true,
                subtotal: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        batchOrders: {
          select: {
            id: true,
            orderNumber: true,
            quantity: true,
            pricePerChick: true,
            totalPrice: true,
            depositAmount: true,
            depositPaid: true,
            status: true,
            createdAt: true,
            batch: {
              select: {
                id: true,
                batchNumber: true,
                type: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 },
      );
    }

    // Compute aggregate stats
    const totalSpent = customer.orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );
    const orderCount = customer.orders.length;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
    const lastOrderDate = orderCount > 0 ? customer.orders[0].createdAt : null;

    // Compute most ordered products: group all order items by productId
    const productMap: Record<string, { productId: string; productName: string; totalQuantity: number }> = {};

    for (const order of customer.orders) {
      for (const item of order.items) {
        const pid = item.product.id;
        if (!productMap[pid]) {
          productMap[pid] = {
            productId: pid,
            productName: item.product.name,
            totalQuantity: 0,
          };
        }
        productMap[pid].totalQuantity += item.quantity;
      }
    }

    const mostOrderedProducts = Object.values(productMap)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);

    // Determine tier
    const tier = getCustomerTier(totalSpent, orderCount);

    return NextResponse.json({
      data: {
        ...customer,
        stats: {
          totalSpent,
          orderCount,
          avgOrderValue,
          lastOrderDate,
        },
        mostOrderedProducts,
        tier,
      },
    });
  } catch (error) {
    console.error('Customer detail fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer details' },
      { status: 500 },
    );
  }
}
