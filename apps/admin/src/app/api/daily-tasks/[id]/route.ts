import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

// PATCH /api/daily-tasks/[id] — toggle done, or update label/detail
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (typeof body.done === 'boolean') {
      update.done = body.done;
      update.doneAt = body.done ? new Date() : null;
    }
    if (typeof body.label === 'string') update.label = body.label.trim();
    if (typeof body.detail === 'string') update.detail = body.detail.trim() || null;

    const task = await (db as any).dailyTask.update({
      where: { id: params.id },
      data: update,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Daily tasks PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/daily-tasks/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await (db as any).dailyTask.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Daily tasks DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
