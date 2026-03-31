import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      items,
      deliveryAddress,
      deliveryCity,
      deliveryPhone,
      deliveryDate,
      notes,
      promoCode,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 },
      );
    }

    // Calculate total price
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 },
        );
      }

      totalPrice += product.price * item.quantity;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtTime: product.price,
      });
    }

    // Apply promo code if provided
    let discount = 0;
    if (promoCode) {
      const promo = await db.promoCode.findUnique({
        where: { code: promoCode },
      });

      if (promo && promo.isActive && new Date() < promo.expiresAt) {
        discount = (totalPrice * promo.discountPercentage) / 100;
        totalPrice -= discount;
      }
    }

    // Create order
    const order = await db.order.create({
      data: {
        userId: session.user.id,
        totalPrice,
        status: 'PENDING_PAYMENT',
        deliveryAddress,
        deliveryCity,
        deliveryPhone,
        deliveryDate: new Date(deliveryDate),
        notes,
        items: {
          createMany: {
            data: orderItems,
          },
        },
      },
      include: { items: true },
    });

    return NextResponse.json(
      {
        message: 'Order created successfully',
        order,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: any = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        skip,
        take: limit,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 },
    );
  }
}
