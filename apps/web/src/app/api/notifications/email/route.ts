import { NextRequest, NextResponse } from 'next/server';
import { db } from '@ecokuku/db';
import { getEmailClient } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, eventType } = body;

    if (!orderId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Fetch order details
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { email: true, name: true, phone: true },
        },
        items: {
          include: { product: true },
        },
      },
    });

    if (!order || !order.user?.email) {
      return NextResponse.json(
        { error: 'Order or customer email not found' },
        { status: 404 },
      );
    }

    const emailClient = getEmailClient();
    let response;

    switch (eventType) {
      case 'ORDER_CONFIRMED':
        response = await emailClient.sendOrderConfirmationEmail(
          order.user.email,
          order.user.name,
          order.id,
          order.totalPrice,
          order.items,
        );
        break;

      case 'DELIVERED':
        response = await emailClient.sendDeliveryConfirmationEmail(
          order.user.email,
          order.user.name,
          order.id,
        );
        break;

      case 'PAYMENT_FAILED':
        response = await emailClient.sendPaymentFailureEmail(
          order.user.email,
          order.user.name,
          order.id,
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 },
        );
    }

    // Log email sending
    console.log(`Email notification sent for order ${orderId} - Event: ${eventType}`);

    return NextResponse.json({
      message: 'Email sent successfully',
      response,
    });
  } catch (error) {
    console.error('Email notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send email notification' },
      { status: 500 },
    );
  }
}
