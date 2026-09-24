/**
 * POST /api/mpesa/c2b
 *
 * Two roles:
 *   1. Safaricom calls this URL (Confirmation + Validation) when a customer
 *      makes a C2B Buy-Goods (Till) payment.  Must respond quickly with
 *      ResultCode: "0" (string, per Daraja spec).
 *   2. GET /api/mpesa/c2b (admin only) triggers the one-time URL registration.
 *
 * Notes from Daraja C2B documentation:
 *   - MSISDN is MASKED in the callback ("2547 ***** 126") — cannot use for DB lookup.
 *   - BillRefNumber is null/empty for Buy Goods (Till) payments.
 *   - ResultCode in the response must be the string "0", not the number 0.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';
import { registerC2BUrls } from '@/lib/mpesa';

// ── Safaricom C2B callback (Validation + Confirmation) ────────────────────────
export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { body = {}; }

  // Validation request (no TransID yet) — always accept
  // ResultCode must be a STRING per Daraja spec
  const ACCEPT = { ResultCode: '0', ResultDesc: 'Accepted' };

  if (!body.TransID) {
    return NextResponse.json(ACCEPT);
  }

  const {
    TransID,
    TransAmount,
    MSISDN,       // ⚠️ Masked in C2B: "2547 ***** 126" — not usable for DB lookups
    FirstName,
    MiddleName,
    LastName,
    BillRefNumber, // null/empty for Buy Goods (Till)
    TransTime,
    TransactionType,
  } = body as {
    TransID: string; TransAmount: string; MSISDN?: string;
    FirstName?: string; MiddleName?: string; LastName?: string;
    BillRefNumber?: string; TransTime?: string; TransactionType?: string;
  };

  try {
    // Dedup — Safaricom may retry if your server was slow
    const existing = await db.income.findUnique({ where: { mpesaTransactionId: TransID } });
    if (existing) return NextResponse.json(ACCEPT);

    const amount    = parseFloat(TransAmount) || 0;
    const buyerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ').trim() || 'Unknown';

    // For Till payments, MSISDN is masked — we store it as-is for the record
    // but cannot use it to look up a customer in the DB.
    // Staff can manually link this income record to an order after reviewing it.
    await db.income.create({
      data: {
        date:               new Date(),
        category:           'OTHER', // staff can recategorise
        description:        `M-Pesa Till — ${buyerName}`,
        amount,
        paymentMethod:      'MPESA',
        buyerName,
        buyerPhone:         MSISDN || null, // stored as-is (masked)
        mpesaTransactionId: TransID,
        accountReference:   BillRefNumber || null,
        sourceType:         'MPESA_C2B',
        notes:              [
          TransTime    ? `Time: ${TransTime}`           : null,
          TransactionType ? `Type: ${TransactionType}` : null,
        ].filter(Boolean).join(' · ') || null,
      },
    });

    console.log(`[M-Pesa C2B] KSh ${amount} from ${buyerName} — TransID: ${TransID}`);
  } catch (err) {
    console.error('[M-Pesa C2B] Error recording income:', err);
    // Still respond with 0 so Safaricom doesn't endlessly retry
  }

  return NextResponse.json(ACCEPT);
}

// ── Admin one-time URL registration ──────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_SHORTCODE) {
      return NextResponse.json({
        error: 'MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET and MPESA_SHORTCODE must be set in .env.local',
      }, { status: 400 });
    }

    const result = await registerC2BUrls();
    return NextResponse.json({ message: 'C2B URLs registered successfully', daraja: result });
  } catch (err: any) {
    console.error('[M-Pesa register] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
