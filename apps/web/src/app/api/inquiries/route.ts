import { NextRequest, NextResponse } from 'next/server';
import { db } from '@ecokuku/db';
import { getEmailClient } from '@/lib/email';

const VALID_AGE_GROUPS = ['day-old', '1-week', '2-weeks', '3-weeks', 'kienyeji'] as const;

const AGE_LABEL: Record<string, string> = {
  'day-old':  'Day-Old Chicks (KSh 110)',
  '1-week':   '1 Week Old (KSh 150)',
  '2-weeks':  '2 Weeks Old (KSh 190)',
  '3-weeks':  '3 Weeks Old (KSh 230)',
  'kienyeji': 'Pure Kienyeji (on request)',
};

async function notifyAdmin(inquiry: {
  firstName: string; lastName: string; phone: string;
  ageGroup: string; quantity: number | null; notes: string | null; id: string;
}) {
  try {
    const client = getEmailClient();
    const adminEmail = process.env.ADMIN_EMAIL || 'info@kwambokapoultry.co.ke';
    await client.sendEmail({
      to: adminEmail,
      subject: `New booking request — ${inquiry.firstName} ${inquiry.lastName}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#F7F3EC;border-radius:12px;overflow:hidden;">
          <div style="background:#1B4D2E;padding:24px 28px;">
            <h2 style="color:#FFCC44;margin:0;font-size:20px;">New Chick Booking Request</h2>
            <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:13px;">Kwamboka Poultry Farm</p>
          </div>
          <div style="padding:24px 28px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:8px 0;color:#7A8470;width:130px;">Name</td><td style="padding:8px 0;color:#1C2116;font-weight:600;">${inquiry.firstName} ${inquiry.lastName}</td></tr>
              <tr><td style="padding:8px 0;color:#7A8470;">Phone</td><td style="padding:8px 0;color:#1C2116;font-weight:600;"><a href="tel:${inquiry.phone}" style="color:#C9841A;">${inquiry.phone}</a></td></tr>
              <tr><td style="padding:8px 0;color:#7A8470;">Age Group</td><td style="padding:8px 0;color:#1C2116;">${AGE_LABEL[inquiry.ageGroup] || inquiry.ageGroup}</td></tr>
              <tr><td style="padding:8px 0;color:#7A8470;">Quantity</td><td style="padding:8px 0;color:#1C2116;">${inquiry.quantity ?? 'Not specified'}</td></tr>
              ${inquiry.notes ? `<tr><td style="padding:8px 0;color:#7A8470;">Notes</td><td style="padding:8px 0;color:#1C2116;">${inquiry.notes}</td></tr>` : ''}
            </table>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid #EDE7DA;">
              <a href="https://wa.me/${inquiry.phone.replace(/\D/g, '').replace(/^0/, '254')}?text=Hello%20${encodeURIComponent(inquiry.firstName)}!%20This%20is%20Kwamboka%20Poultry%20Farm%20calling%20about%20your%20chick%20booking%20request."
                 style="display:inline-block;background:#C9841A;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
                WhatsApp ${inquiry.firstName} →
              </a>
            </div>
          </div>
          <div style="padding:12px 28px;background:#EDE7DA;font-size:11px;color:#7A8470;">
            Booking ID: ${inquiry.id} · Received via kwambokapoultry.co.ke
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.warn('[Inquiries] Email notification skipped:', err instanceof Error ? err.message : err);
  }
}

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

    // Fire email notification — non-blocking, never fails the response
    notifyAdmin({
      firstName: inquiry.firstName,
      lastName: inquiry.lastName,
      phone: inquiry.phone,
      ageGroup: inquiry.ageGroup,
      quantity: inquiry.quantity,
      notes: inquiry.notes,
      id: inquiry.id,
    });

    return NextResponse.json({ message: 'Booking request received. We will call you back shortly!', id: inquiry.id }, { status: 201 });
  } catch (err) {
    console.error('[Inquiries] Error:', err);
    return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
  }
}
