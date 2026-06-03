import { NextRequest, NextResponse } from 'next/server';
import { db } from '@ecokuku/db';

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
      return NextResponse.json({ message: 'Callback processed' }, { status: 200 });
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;

    if (ResultCode === 0) {
      let transactionRef = '';
      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') {
            transactionRef = String(item.Value);
            break;
          }
        }
      }

      await db.order.updateMany({
        where: { paymentRef: CheckoutRequestID },
        data: {
          status: 'PAID',
          ...(transactionRef ? { paymentRef: transactionRef } : {}),
        },
      });
    } else {
      await db.order.updateMany({
        where: { paymentRef: CheckoutRequestID },
        data: { status: 'FAILED' },
      });
    }

    return NextResponse.json({ message: 'Callback processed' }, { status: 200 });
  } catch (error) {
    console.error('M-PESA callback error:', error);
    return NextResponse.json({ message: 'Callback processed' }, { status: 200 });
  }
}
