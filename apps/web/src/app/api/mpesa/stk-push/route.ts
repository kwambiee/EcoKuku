import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { authOptions } from '@/lib/auth';
import { getMpesaClient } from '@/lib/mpesa';

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
    const { orderId, phoneNumber, amount } = body;

    if (!orderId || !phoneNumber || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Verify order exists and belongs to user
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 },
      );
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Initiate M-PESA STK Push
    const mpesaClient = getMpesaClient();

    const response = await mpesaClient.initiateStkPush({
      amount,
      phoneNumber,
      accountReference: orderId,
      transactionDesc: `Order #${orderId.substring(0, 8)} - EcoKuku`,
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/mpesa/callback`,
    });

    // Store the checkout request ID with the order
    await db.order.update({
      where: { id: orderId },
      data: {
        mpesaCheckoutRequestId: response.CheckoutRequestID,
      },
    });

    return NextResponse.json({
      message: 'STK push initiated',
      checkoutRequestId: response.CheckoutRequestID,
      responseCode: response.ResponseCode,
      customerMessage: response.CustomerMessage,
    });
  } catch (error) {
    console.error('M-PESA STK push error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 },
    );
  }
}
