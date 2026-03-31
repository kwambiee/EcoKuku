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

    const promoCode = await db.promoCode.findUnique({
      where: { code },
    });

    if (!promoCode) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 404 },
      );
    }

    if (!promoCode.isActive) {
      return NextResponse.json(
        { error: 'This promo code is no longer active' },
        { status: 400 },
      );
    }

    if (new Date() > promoCode.expiresAt) {
      return NextResponse.json(
        { error: 'This promo code has expired' },
        { status: 400 },
      );
    }

    if (orderTotal && orderTotal < promoCode.minOrderValue) {
      return NextResponse.json(
        {
          error: `Minimum order value of ${promoCode.minOrderValue} required`,
        },
        { status: 400 },
      );
    }

    const discount = (orderTotal * promoCode.discountPercentage) / 100;

    return NextResponse.json({
      valid: true,
      code: promoCode.code,
      discountPercentage: promoCode.discountPercentage,
      discountAmount: discount,
      description: promoCode.description,
    });
  } catch (error) {
    console.error('Promo validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate promo code' },
      { status: 500 },
    );
  }
}
