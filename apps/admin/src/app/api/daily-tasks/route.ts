import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

// GET /api/daily-tasks?date=YYYY-MM-DD
// Returns today's custom tasks + undone tasks from the past 7 days
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const today = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    const tasks = await (db as any).dailyTask.findMany({
      where: {
        OR: [
          { taskDate: today },
          { taskDate: { gte: sevenDaysAgoStr, lt: today }, done: false },
        ],
      },
      orderBy: [{ taskDate: 'desc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Daily tasks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/daily-tasks
// Create a new custom task for today (or specified date)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { label, detail, link, taskDate } = await request.json();
    if (!label?.trim()) return NextResponse.json({ error: 'Task label required' }, { status: 400 });

    const date = taskDate || new Date().toISOString().slice(0, 10);

    const task = await (db as any).dailyTask.create({
      data: {
        taskDate: date,
        label: label.trim(),
        detail: detail?.trim() || null,
        link: link?.trim() || null,
        createdBy: session.user.name || null,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Daily tasks POST error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
