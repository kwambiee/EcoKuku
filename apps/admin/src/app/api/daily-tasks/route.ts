import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

// GET /api/daily-tasks — returns all non-DONE tasks + DONE tasks from last 2 days
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

    const tasks = await (db as any).dailyTask.findMany({
      where: {
        OR: [
          { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          { status: 'DONE', taskDate: { gte: twoDaysAgo } },
          { taskDate: date },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Daily tasks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/daily-tasks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { label, detail, link, taskDate, priority, category, deadline, duration, assignedPhone } = body;
    if (!label?.trim()) return NextResponse.json({ error: 'Task label required' }, { status: 400 });

    const date = taskDate || new Date().toISOString().slice(0, 10);

    const task = await (db as any).dailyTask.create({
      data: {
        taskDate: date,
        label: label.trim(),
        detail: detail?.trim() || null,
        link: link?.trim() || null,
        createdBy: session.user.name || null,
        status: 'OPEN',
        priority: priority || 'MEDIUM',
        category: category || 'general',
        deadline: deadline ? new Date(deadline) : null,
        duration: duration?.trim() || null,
        assignedPhone: assignedPhone?.trim() || null,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Daily tasks POST error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
