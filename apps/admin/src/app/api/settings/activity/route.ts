import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const module = request.nextUrl.searchParams.get('module');

    const logs = await db.activityLog.findMany({
      where: module ? { module } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error('Activity log fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, module, recordId } = await request.json();
    if (!action || !module) return NextResponse.json({ error: 'action and module required' }, { status: 400 });

    const log = await db.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || '',
        userEmail: session.user.email || '',
        action,
        module,
        recordId: recordId || null,
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('Activity log create error:', error);
    return NextResponse.json({ error: 'Failed to create log entry' }, { status: 500 });
  }
}
