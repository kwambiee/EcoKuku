import { NextRequest, NextResponse } from 'next/server';
import { db } from '@ecokuku/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, orderTotal } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 },
      );
    }

    const promo = await db.promo.findUnique({
      where: { code },
    });

    if (!promo) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 404 },
      );
    }

    if (!promo.active) {
      return NextResponse.json(
        { error: 'This promo code is no longer active' },
        { status: 400 },
      );
    }

    if (new Date() > promo.endDate) {
      return NextResponse.json(
        { error: 'This promo code has expired' },
        { status: 400 },
      );
    }

    if (promo.maxUses && promo.uses >= promo.maxUses) {
      return NextResponse.json(
        { error: 'This promo code has reached its usage limit' },
        { status: 400 },
      );
    }

    let discountAmount = 0;
    const discountValue = Number(promo.discountValue);

    if (promo.discountType === 'PERCENTAGE') {
      discountAmount = orderTotal ? Math.round((orderTotal * discountValue) / 100) : 0;
    } else {
      discountAmount = discountValue;
    }

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue,
      discountAmount,
      description: promo.description,
    });
  } catch (error) {
    console.error('Promo validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate promo code' },
      { status: 500 },
    );
  }
}
