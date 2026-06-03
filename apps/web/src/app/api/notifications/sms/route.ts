import { NextRequest, NextResponse } from 'next/server';
import { db } from '@ecokuku/db';
import { getSMSClient } from '@/lib/sms';

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
        customer: {
          select: { phone: true, name: true },
        },
      },
    });

    if (!order || !order.customer?.phone) {
      return NextResponse.json(
        { error: 'Order or customer phone not found' },
        { status: 404 },
      );
    }

    const smsClient = getSMSClient();
    let response;

    switch (eventType) {
      case 'ORDER_CONFIRMED':
        response = await smsClient.sendOrderConfirmation(
          order.customer.phone,
          order.id,
          Number(order.total),
        );
        break;

      case 'PAYMENT_RECEIVED':
        response = await smsClient.sendPaymentReminder(
          order.customer.phone,
          order.id,
        );
        break;

      case 'OUT_FOR_DELIVERY':
        if (order.driverId) {
          const driver = await db.driver.findUnique({
            where: { id: order.driverId },
            select: { name: true, phone: true },
          });

          if (driver) {
            response = await smsClient.sendDeliveryNotification(
              order.customer.phone,
              order.id,
              driver.name,
              driver.phone,
            );
          }
        }
        break;

      case 'DELIVERED':
        response = await smsClient.sendDeliveryConfirmation(
          order.customer.phone,
          order.id,
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 },
        );
    }

    // Log SMS sending
    console.log(`SMS notification sent for order ${orderId} - Event: ${eventType}`);

    return NextResponse.json({
      message: 'SMS sent successfully',
      response,
    });
  } catch (error) {
    console.error('SMS notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS notification' },
      { status: 500 },
    );
  }
}
