import { NextRequest, NextResponse } from 'next/server';
import { db } from '@ecokuku/db';

const VALID_AGE_GROUPS = ['day-old', '1-week', '2-weeks', '3-weeks', 'kienyeji'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, ageGroup, quantity, notes } = body as {
      firstName?: string; lastName?: string; phone?: string;
      ageGroup?: string; quantity?: number; notes?: string;
    };

    if (!firstName?.trim() || !lastName?.trim() || !phone?.trim() || !ageGroup) {
      return NextResponse.json({ error: 'First name, last name, phone and age group are required' }, { status: 400 });
    }

    if (!VALID_AGE_GROUPS.includes(ageGroup as any)) {
      return NextResponse.json({ error: 'Invalid age group' }, { status: 400 });
    }

    const inquiry = await db.chickInquiry.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        ageGroup,
        quantity: quantity ? Math.max(1, Math.round(quantity)) : null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ message: 'Booking request received. We will call you back shortly!', id: inquiry.id }, { status: 201 });
  } catch (err) {
    console.error('[Inquiries] Error:', err);
    return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
  }
}
