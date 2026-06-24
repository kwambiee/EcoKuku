import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (batchId) where.batchId = batchId;

    const [events, activeWithdrawals] = await Promise.all([
      db.healthEvent.findMany({
        where,
        take: limit,
        include: { batch: { select: { id: true, batchNumber: true, type: true } } },
        orderBy: { date: 'desc' },
      }),
      db.healthEvent.findMany({
        where: {
          withdrawalEnds: { gte: new Date() },
          outcome: { not: 'MORTALITY' },
        },
        include: { batch: { select: { id: true, batchNumber: true, type: true } } },
        orderBy: { withdrawalEnds: 'asc' },
      }),
    ]);

    const stats = {
      totalEvents: events.length,
      activeIssues: events.filter((e) => e.outcome === 'ONGOING' || e.outcome === 'RECOVERING').length,
      activeWithdrawals: activeWithdrawals.length,
      mortalityFromDisease: events.filter((e) => e.outcome === 'MORTALITY').length,
    };

    return NextResponse.json({ data: events, activeWithdrawals, stats });
  } catch (error) {
    console.error('Health events fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch health events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      batchId, type, date, disease, symptoms, diagnosis,
      treatment, dosage, duration, withdrawalPeriod,
      outcome, vetName, cost, notes,
    } = body;

    if (!batchId || !date || !symptoms) {
      return NextResponse.json({ error: 'batchId, date, and symptoms are required' }, { status: 400 });
    }

    const eventDate = new Date(date);
    const wpDays = withdrawalPeriod ? parseInt(String(withdrawalPeriod)) : null;
    const withdrawalEnds = wpDays && wpDays > 0
      ? new Date(eventDate.getTime() + wpDays * 86400000)
      : null;

    const event = await db.healthEvent.create({
      data: {
        batchId,
        type: type || 'disease',
        date: eventDate,
        disease: disease || null,
        symptoms,
        diagnosis: diagnosis || null,
        treatment: treatment || null,
        dosage: dosage || null,
        duration: duration || null,
        withdrawalPeriod: wpDays,
        withdrawalEnds,
        outcome: outcome || 'ONGOING',
        vetName: vetName || null,
        cost: cost ? parseFloat(cost) : null,
        notes: notes || null,
      },
      include: { batch: { select: { id: true, batchNumber: true } } },
    });

    if (cost && parseFloat(cost) > 0) {
      await db.expense.create({
        data: {
          category: 'MEDICINE_VACCINE',
          description: `Treatment: ${disease || symptoms}${event.batch ? ` — batch ${event.batch.batchNumber}` : ''}`,
          amount: parseFloat(cost),
          date: eventDate,
          sourceType: 'HEALTH_EVENT',
          sourceId: event.id,
        },
      });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Health event creation error:', error);
    return NextResponse.json({ error: 'Failed to create health event' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { eventId, outcome, notes, treatment, dosage, duration, withdrawalPeriod, diagnosis, vetName, cost } = body;

    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

    const updateData: any = {};
    if (outcome !== undefined) updateData.outcome = outcome;
    if (notes !== undefined) updateData.notes = notes;
    if (treatment !== undefined) updateData.treatment = treatment;
    if (dosage !== undefined) updateData.dosage = dosage;
    if (duration !== undefined) updateData.duration = duration;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (vetName !== undefined) updateData.vetName = vetName;
    if (cost !== undefined) updateData.cost = cost ? parseFloat(cost) : null;
    if (withdrawalPeriod !== undefined) {
      const wpDays = parseInt(String(withdrawalPeriod)) || 0;
      updateData.withdrawalPeriod = wpDays > 0 ? wpDays : null;
      const existing = await db.healthEvent.findUnique({ where: { id: eventId } });
      if (existing && wpDays > 0) {
        updateData.withdrawalEnds = new Date(existing.date.getTime() + wpDays * 86400000);
      }
    }

    const event = await db.healthEvent.update({
      where: { id: eventId },
      data: updateData,
      include: { batch: { select: { id: true, batchNumber: true } } },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Health event update error:', error);
    return NextResponse.json({ error: 'Failed to update health event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 });

    await db.healthEvent.delete({ where: { id: body.eventId } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Health event delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
