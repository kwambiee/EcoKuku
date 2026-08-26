import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';
import { sendStaffRequestNotification, sendApprovalEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';

// POST — public (no auth), staff submits access request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, role, message } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'name, email and role are required' }, { status: 400 });
    }
    if (!['STAFF', 'DRIVER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check for duplicate pending request
    const existing = await db.staffRequest.findFirst({
      where: { email, status: 'PENDING' },
    });
    if (existing) {
      return NextResponse.json({ error: 'A pending request already exists for this email' }, { status: 409 });
    }

    // Check if already a staff member
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'This email already has an account' }, { status: 409 });
    }

    const req = await db.staffRequest.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        role,
        message: message?.trim() || null,
        status: 'PENDING',
      },
    });

    // Notify admins via email (non-blocking — don't fail the request if email fails)
    sendStaffRequestNotification({ name, email, phone, role, message }).catch(() => {});

    return NextResponse.json({ message: 'Request submitted successfully', id: req.id }, { status: 201 });
  } catch (error: any) {
    console.error('Staff request POST error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to submit request' }, { status: 500 });
  }
}

// GET — admin only, list requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const status = request.nextUrl.searchParams.get('status') || 'PENDING';
    const requests = await db.staffRequest.findMany({
      where: status === 'ALL' ? {} : { status },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ data: requests });
  } catch (error) {
    console.error('Staff request GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

// PATCH — admin only, approve or reject
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await request.json();
    const { requestId, action, rejectedReason } = body; // action: 'APPROVE' | 'REJECT'

    if (!requestId || !action) return NextResponse.json({ error: 'requestId and action required' }, { status: 400 });
    if (!['APPROVE', 'REJECT'].includes(action)) return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 });

    const req = await db.staffRequest.findUnique({ where: { id: requestId } });
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (req.status !== 'PENDING') return NextResponse.json({ error: 'Request already processed' }, { status: 409 });

    if (action === 'REJECT') {
      await db.staffRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', rejectedReason: rejectedReason || null },
      });
      return NextResponse.json({ message: 'Request rejected' });
    }

    // APPROVE — create the user account with a temp password
    const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase();
    const hashed = await bcrypt.hash(tempPassword, 10);

    // Check email not already taken (could have been added manually in the meantime)
    const existingUser = await db.user.findUnique({ where: { email: req.email } });
    if (existingUser) {
      await db.staffRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } });
      return NextResponse.json({ message: 'Account already exists — request marked approved', tempPassword: null });
    }

    await db.$transaction([
      db.user.create({
        data: {
          name: req.name,
          email: req.email,
          phone: req.phone || undefined,
          password: hashed,
          role: req.role as any,
          isActive: true,
        },
      }),
      db.staffRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      }),
    ]);

    // Email the new staff member their credentials
    sendApprovalEmail(req.email, req.name, req.role, tempPassword).catch(() => {});

    return NextResponse.json({
      message: `Account created for ${req.name}`,
      tempPassword, // shown in UI so admin can share it manually if email is not configured
    });
  } catch (error: any) {
    console.error('Staff request PATCH error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process request' }, { status: 500 });
  }
}
