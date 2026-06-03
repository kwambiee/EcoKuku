import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { authOptions } from '@/lib/auth';

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `ORD-${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !('id' in session.user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const userId = (session.user as any).id;

    const body = await request.json();
    const {
      items,
      deliveryAddress,
      deliveryArea,
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

    let subtotal = 0;
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

      if (!product.available) {
        return NextResponse.json(
          { error: `Product ${product.name} is not available` },
          { status: 400 },
        );
      }

      const itemPrice = Number(product.price);
      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        subtotal: itemSubtotal,
      });
    }

    const deliveryFee = 200;
    let discountAmount = 0;
    let promoId: string | undefined;

    if (promoCode) {
      const promo = await db.promo.findUnique({
        where: { code: promoCode },
      });

      if (promo && promo.active && new Date() < promo.endDate) {
        const discountValue = Number(promo.discountValue);
        if (promo.discountType === 'PERCENTAGE') {
          discountAmount = Math.round((subtotal * discountValue) / 100);
        } else {
          discountAmount = discountValue;
        }
        promoId = promo.id;
        await db.promo.update({
          where: { id: promo.id },
          data: { uses: { increment: 1 } },
        });
      }
    }

    const total = subtotal + deliveryFee - discountAmount;

    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: userId,
        status: 'PENDING',
        subtotal,
        deliveryFee,
        discountAmount,
        total,
        promoId,
        deliveryAddress,
        deliveryArea,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
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

    if (!session?.user || !('id' in session.user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const userId = (session.user as any).id;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: any = {
      customerId: userId,
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
