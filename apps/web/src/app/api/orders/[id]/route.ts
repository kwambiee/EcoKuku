import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { authOptions } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !('id' in session.user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Fetch the order and verify it belongs to the logged-in user
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
        delivery: {
          select: {
            scheduledDate: true,
            status: true,
            location: true,
            driver: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify the order belongs to the current user
    if (order.customerId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      data: {
        ...order,
        delivery: order.delivery ? {
          address: order.deliveryAddress,
          scheduledDate: order.delivery.scheduledDate,
          location: order.delivery.location,
          status: order.delivery.status,
          driver: order.delivery.driver?.name,
        } : undefined,
      },
    });
  } catch (error) {
    console.error('Order detail fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
