import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

async function logActivity(session: any, action: string, module: string, recordId?: string) {
  try {
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        action,
        module,
        recordId: recordId || null,
      },
    });
  } catch { /* non-fatal */ }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const staff = await db.user.findMany({
      where: { role: { in: ['ADMIN', 'STAFF', 'DRIVER'] } },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ data: staff });
  } catch (error) {
    console.error('Staff fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { name, email, phone, password, role } = await request.json();
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'name, email, password, and role are required' }, { status: 400 });
    }
    if (!['ADMIN', 'STAFF', 'DRIVER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { name, email, phone: phone || null, password: hashed, role, isActive: true },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    });

    await logActivity(session, `Created ${role} account for ${name} (${email})`, 'SETTINGS', user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Email or phone already in use' }, { status: 409 });
    console.error('Staff create error:', error);
    return NextResponse.json({ error: 'Failed to create staff account' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { userId, name, phone, role, isActive, password } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Prevent admin from deactivating themselves
    if (userId === session.user.id && isActive === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role !== undefined && ['ADMIN', 'STAFF', 'DRIVER'].includes(role)) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    });

    const actions = [];
    if (role !== undefined) actions.push(`role → ${role}`);
    if (isActive !== undefined) actions.push(isActive ? 'reactivated' : 'deactivated');
    if (password) actions.push('password reset');
    if (actions.length > 0) {
      await logActivity(session, `Updated ${user.name}: ${actions.join(', ')}`, 'SETTINGS', userId);
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Staff update error:', error);
    return NextResponse.json({ error: 'Failed to update staff account' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (userId === session.user.id) return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });

    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    await db.user.delete({ where: { id: userId } });
    await logActivity(session, `Deleted account for ${user?.name} (${user?.email})`, 'SETTINGS', userId);

    return NextResponse.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Staff delete error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
