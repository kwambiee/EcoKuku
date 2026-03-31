import { NextRequest, NextResponse } from 'next/server';
import { db } from '@ecokuku/db';

// M-PESA callback payload structure based on Daraja API documentation
interface MpesaCallback {
  Body: {
    stkCallback?: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: any;
        }>;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MpesaCallback = await request.json();
    const callback = body.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json(
        { error: 'Invalid callback structure' },
        { status: 400 },
      );
    }

    const { ResultCode, CheckoutRequestID, CallbackMetadata } = callback;

    // Extract metadata if payment was successful
    let amount = 0;
    let phoneNumber = '';
    let transactionId = '';

    if (CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'Amount':
            amount = item.Value;
            break;
          case 'MpesaReceiptNumber':
            transactionId = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value;
            break;
        }
      }
    }

    // Check if payment was successful (ResultCode 0 = success)
    if (ResultCode === 0) {
      // Find order by CheckoutRequestID (you need to store this during order creation)
      const mpesaTransaction = await db.mPesaTransaction.create({
        data: {
          checkoutRequestId: CheckoutRequestID,
          transactionId,
          amount,
          phoneNumber,
          status: 'SUCCESS',
        },
      });

      // Update order status if order is linked to this transaction
      // Note: You need to store CheckoutRequestID with the order
      // await db.order.updateMany({
      //   where: { mpesaCheckoutRequestId: CheckoutRequestID },
      //   data: { status: 'PAID' }
      // });

      return NextResponse.json({
        message: 'Payment confirmed',
        transactionId: mpesaTransaction.id,
      });
    } else {
      // Payment failed
      await db.mPesaTransaction.create({
        data: {
          checkoutRequestId: CheckoutRequestID,
          transactionId,
          amount,
          phoneNumber,
          status: 'FAILED',
        },
      });

      return NextResponse.json({
        message: 'Payment failed',
        resultCode: ResultCode,
      });
    }
  } catch (error) {
    console.error('M-PESA callback error:', error);
    // Important: Always return 200 to M-PESA to acknowledge receipt
    return NextResponse.json(
      { message: 'Callback processed' },
      { status: 200 },
    );
  }
}
