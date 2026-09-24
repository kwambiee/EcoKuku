/**
 * STK Push — Lipa na M-Pesa Online
 *
 * POST /api/mpesa/stk  (two callers)
 *   a) Admin UI — body: { phone, amount, accountReference, description }
 *      Triggers a payment prompt on the customer's phone.
 *
 *   b) Safaricom callback — body contains ResultCode / Body / stkCallback
 *      Records successful/failed payments in the Income table.
 *
 * The two callers are distinguished by the presence of "Body" in the payload,
 * which is the Safaricom callback envelope.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';
import { stkPush } from '@/lib/mpesa';

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { body = {}; }

  // ── Path A: Safaricom callback (has Body.stkCallback) ─────────────────────
  if (body?.Body?.stkCallback !== undefined) {
    return handleStkCallback(body.Body.stkCallback);
  }

  // ── Path B: Admin-initiated STK push ──────────────────────────────────────
  const session = await getServerSession(adminAuthOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { phone, amount, accountReference, description } = body as {
    phone?: string; amount?: number; accountReference?: string; description?: string;
  };

  if (!phone || !amount) {
    return NextResponse.json({ error: 'phone and amount are required' }, { status: 400 });
  }

  // Normalise phone to 254XXXXXXXXX
  const normalised = phone.replace(/^\+/, '').replace(/^0/, '254');

  if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_SHORTCODE) {
    return NextResponse.json({
      error: 'M-Pesa is not configured yet. Add MPESA_* variables to .env.local on the server.',
    }, { status: 400 });
  }

  try {
    const result = await stkPush({
      phone:            normalised,
      amount,
      accountReference: accountReference || 'Kwamboka',
      description:      description      || 'Payment',
    });
    return NextResponse.json({
      message:           'STK push sent. Customer will see a prompt on their phone.',
      checkoutRequestId: result.CheckoutRequestID,
      customerMessage:   result.CustomerMessage,
    });
  } catch (err: any) {
    console.error('[STK push] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Safaricom callback handler ────────────────────────────────────────────────
async function handleStkCallback(cb: any) {
  // Always respond 200 fast
  const respond = () => NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const { ResultCode, ResultDesc, CallbackMetadata, CheckoutRequestID } = cb;

    if (ResultCode !== 0) {
      // Customer cancelled or failed — log but don't create income
      console.log(`[STK callback] Failed — ${ResultDesc} — CheckoutRequestID: ${CheckoutRequestID}`);
      return respond();
    }

    // Extract metadata items
    const items: Record<string, string | number> = {};
    for (const item of (CallbackMetadata?.Item || [])) {
      if (item.Value !== undefined) items[item.Name] = item.Value;
    }

    const transID  = String(items['MpesaReceiptNumber'] || '');
    const amount   = parseFloat(String(items['Amount'] || 0));
    const phone    = String(items['PhoneNumber'] || '');
    const transDate = items['TransactionDate']
      ? parseTransDate(String(items['TransactionDate']))
      : new Date();

    if (!transID) { console.warn('[STK callback] No MpesaReceiptNumber'); return respond(); }

    // Dedup
    const existing = await db.income.findUnique({ where: { mpesaTransactionId: transID } });
    if (existing) return respond();

    await db.income.create({
      data: {
        date:               transDate,
        category:           'OTHER',
        description:        `M-Pesa STK — ${phone}`,
        amount,
        paymentMethod:      'MPESA',
        buyerPhone:         phone ? `+${phone}` : null,
        mpesaTransactionId: transID,
        sourceType:         'MPESA_STK',
        notes:              `CheckoutRequestID: ${CheckoutRequestID}`,
      },
    });

    console.log(`[STK callback] KSh ${amount} from ${phone} — TransID: ${transID}`);
  } catch (err) {
    console.error('[STK callback] DB error:', err);
  }

  return NextResponse.json({ ResultCode: '0', ResultDesc: 'Accepted' });
}

// Safaricom sends TransactionDate as YYYYMMDDHHmmss string
function parseTransDate(raw: string): Date {
  const s = String(raw);
  if (s.length < 14) return new Date();
  const [y, mo, d, h, min, sec] = [
    s.slice(0,4), s.slice(4,6), s.slice(6,8),
    s.slice(8,10), s.slice(10,12), s.slice(12,14),
  ].map(Number);
  return new Date(y, mo - 1, d, h, min, sec);
}
