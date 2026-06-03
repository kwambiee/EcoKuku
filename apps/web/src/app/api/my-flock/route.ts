import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { authOptions } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !('id' in session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const batchOrders = await db.batchOrder.findMany({
      where: {
        customerId: userId,
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            type: true,
            breed: true,
            startDate: true,
            expectedReady: true,
            currentCount: true,
            growthLogs: {
              orderBy: { date: 'desc' },
              take: 5,
              select: { id: true, date: true, avgWeight: true, notes: true },
            },
            vaccinations: {
              orderBy: { dateAdministered: 'desc' },
              take: 10,
              select: { id: true, vaccineType: true, dateAdministered: true, dosage: true },
            },
            healthEvents: {
              where: { type: { in: ['vet_visit', 'treatment'] } },
              orderBy: { date: 'desc' },
              take: 5,
              select: { id: true, type: true, date: true, treatment: true, notes: true },
            },
          },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = batchOrders.map((bo) => ({
      ...bo,
      ageInDays: Math.floor(
        (Date.now() - new Date(bo.batch.startDate).getTime()) / (1000 * 60 * 60 * 24),
      ),
      latestWeight: bo.batch.growthLogs[0]?.avgWeight ?? null,
      lastVaccination: bo.batch.vaccinations[0] ?? null,
    }));

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error('My flock fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch flock data' }, { status: 500 });
  }
}
