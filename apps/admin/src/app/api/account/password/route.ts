import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
