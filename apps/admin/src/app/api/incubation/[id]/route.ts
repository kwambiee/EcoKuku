import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;
    const batch = await db.incubationBatch.findUnique({ where: { id } });
    if (!batch) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ data: batch });
  } catch (error) {
    console.error('Incubation batch fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;
    const body = await request.json();
    const { action } = body;

    if (action === 'log_results') {
      const { hatchedCount, failedCount, weakChicks, notes } = body;

      if (hatchedCount === undefined || failedCount === undefined) {
        return NextResponse.json({ error: 'hatchedCount and failedCount required' }, { status: 400 });
      }

      const hatched = parseInt(String(hatchedCount)) || 0;
      const failed = parseInt(String(failedCount)) || 0;
      const weak = parseInt(String(weakChicks || 0)) || 0;

      const updateData: any = {
        hatchedCount: hatched,
        failedCount: failed,
        weakChicks: weak,
        status: 'COMPLETED',
      };
      if (notes) updateData.notes = notes;

      const batch = await db.incubationBatch.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ message: 'Hatch results recorded', batch });
    }

    if (action === 'move_to_farm') {
      const { batchNumber, type, coopAssignment, notes: moveNotes } = body;

      if (!batchNumber || !type) {
        return NextResponse.json({ error: 'batchNumber and type required' }, { status: 400 });
      }

      const incBatch = await db.incubationBatch.findUnique({ where: { id } });
      if (!incBatch) {
        return NextResponse.json({ error: 'Incubation batch not found' }, { status: 404 });
      }
      if (incBatch.hatchedCount <= 0) {
        return NextResponse.json({ error: 'No hatched chicks to move. Log results first.' }, { status: 400 });
      }

      const farmBatch = await db.batch.create({
        data: {
          batchNumber,
          type: type as any,
          quantity: incBatch.hatchedCount,
          currentCount: incBatch.hatchedCount,
          startDate: new Date(),
          status: 'ACTIVE',
          source: 'INCUBATION',
          incubationBatchId: id,
          coopAssignment: coopAssignment || null,
          notes: moveNotes || `Hatched from ${incBatch.batchNumber}. ${incBatch.eggCount} eggs → ${incBatch.hatchedCount} hatched (${Math.round((incBatch.hatchedCount / incBatch.eggCount) * 100)}% rate). ${incBatch.weakChicks > 0 ? `${incBatch.weakChicks} weak/deformed.` : ''}`,
        },
      });

      await db.incubationBatch.update({
        where: { id },
        data: {
          status: 'CLOSED',
          coopAssignment: coopAssignment || null,
          transferDate: new Date(),
        },
      });

      return NextResponse.json({ message: 'Chicks moved to farm', farmBatch });
    }

    // Generic update (backward compat)
    const { hatchedCount, failedCount, weakChicks, notes } = body;
    const updateData: any = {};
    if (hatchedCount !== undefined) updateData.hatchedCount = parseInt(String(hatchedCount)) || 0;
    if (failedCount !== undefined) updateData.failedCount = parseInt(String(failedCount)) || 0;
    if (weakChicks !== undefined) updateData.weakChicks = parseInt(String(weakChicks)) || 0;
    if (notes !== undefined) updateData.notes = notes;
    if (updateData.hatchedCount > 0 || updateData.failedCount > 0) updateData.status = 'COMPLETED';

    const batch = await db.incubationBatch.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: 'Updated', batch });
  } catch (error: any) {
    console.error('Incubation batch update error:', error?.message || error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Batch number already exists' }, { status: 409 });
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Incubation batch not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to update incubation batch' }, { status: 500 });
  }
}
