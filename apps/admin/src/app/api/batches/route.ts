import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

const VACCINE_SCHEDULE = [
  { vaccine: "Marek's", daysOld: 1 },
  { vaccine: 'Newcastle', daysOld: 7 },
  { vaccine: 'Coccidiosis', daysOld: 7 },
  { vaccine: 'IB', daysOld: 10 },
  { vaccine: 'Gumboro', daysOld: 14 },
  { vaccine: 'ND Booster', daysOld: 21 },
  { vaccine: 'Gumboro Booster', daysOld: 28 },
  { vaccine: 'Fowl Pox', daysOld: 42 },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [batches, total, mortalityThisMonth, vaccinations]: [any[], number, any, any[]] = await Promise.all([
      db.batch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      db.batch.count({ where }),
      db.mortalityLog.aggregate({
        where: { date: { gte: monthStart } },
        _sum: { count: true },
      }),
      db.vaccination.findMany({
        where: { batch: { status: 'ACTIVE' } },
        select: { vaccineType: true, batchId: true },
      }),
    ]);

    const totalBirds = batches.filter((b: any) => b.status === 'ACTIVE').reduce((s: number, b: any) => s + b.currentCount, 0);

    // Compute health alerts per batch
    let totalHealthAlerts = 0;
    const batchesWithAlerts = batches.map((batch: any) => {
      const daysSinceStart = Math.floor((Date.now() - new Date(batch.startDate).getTime()) / 86400000);
      const ageInDays = daysSinceStart + (batch.ageAtArrival || 0);
      const batchVacs = vaccinations.filter((v: any) => v.batchId === batch.id);
      const healthAlerts: string[] = [];

      if (batch.status === 'ACTIVE') {
        for (const sched of VACCINE_SCHEDULE) {
          const kw = sched.vaccine.toUpperCase();
          const isBooster = sched.vaccine.includes('Booster');
          const isLogged = batchVacs.some((v: any) => {
            const vt = v.vaccineType.toUpperCase();
            if (!vt.includes(kw.split(' ')[0])) return false;
            if (isBooster) return vt.includes('BOOSTER') || vt.includes('2ND');
            return !vt.includes('BOOSTER');
          });
          if (!isLogged) {
            const daysUntilDue = sched.daysOld - ageInDays;
            if (daysUntilDue < 0) {
              healthAlerts.push(`${sched.vaccine} overdue`);
            } else if (daysUntilDue <= 3) {
              healthAlerts.push(`${sched.vaccine} in ${daysUntilDue}d`);
            }
          }
        }
      }

      if (healthAlerts.length > 0) totalHealthAlerts++;

      const costPerChick = batch.acquisitionCost && batch.quantity > 0
        ? (Number(batch.acquisitionCost) / batch.quantity).toFixed(2)
        : null;

      return {
        ...batch,
        acquisitionCost: batch.acquisitionCost ? Number(batch.acquisitionCost) : null,
        costPerChick: costPerChick ? parseFloat(costPerChick) : null,
        ageWeeks: Math.floor(ageInDays / 7),
        ageDays: ageInDays,
        healthAlerts,
      };
    });

    const mortalityTotal = mortalityThisMonth._sum.count || 0;
    const mortalityRate = totalBirds > 0 ? ((mortalityTotal / totalBirds) * 100).toFixed(1) : '0';

    // Type breakdown for active batches
    const typeBreakdown: Record<string, number> = {};
    batches.filter((b: any) => b.status === 'ACTIVE').forEach((b: any) => {
      const t = (b.type as string).toLowerCase();
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
    });

    return NextResponse.json({
      data: batchesWithAlerts,
      stats: {
        totalBirds,
        activeBatchCount: batches.filter((b: any) => b.status === 'ACTIVE').length,
        mortalityThisMonth: mortalityTotal,
        mortalityRate,
        healthAlerts: totalHealthAlerts,
        typeBreakdown,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Batches fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      batchNumber, type, quantity, startDate, notes,
      source, supplier, coopAssignment, acquisitionCost, ageAtArrival,
    } = body;

    if (!batchNumber || !type || !quantity || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const qty = parseInt(String(quantity)) || 0;
    if (qty <= 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    const cost = acquisitionCost ? parseFloat(String(acquisitionCost)) : null;

    const batch = await db.batch.create({
      data: {
        batchNumber,
        type: type as any,
        quantity: qty,
        currentCount: qty,
        startDate: new Date(startDate),
        status: 'ACTIVE',
        source: source || 'PURCHASED',
        supplier: supplier || null,
        coopAssignment: coopAssignment || null,
        acquisitionCost: cost && !isNaN(cost) ? cost : null,
        ageAtArrival: parseInt(String(ageAtArrival || 0)) || 0,
        notes: notes || null,
      },
    });

    if (cost && cost > 0) {
      try {
        await db.expense.create({
          data: {
            category: 'CHICKS_PURCHASE',
            description: `Batch ${batchNumber}: ${qty} ${type.toLowerCase()} chicks${supplier ? ` from ${supplier}` : ''}`,
            amount: cost,
            vendor: supplier || null,
            date: new Date(startDate),
            sourceType: 'BATCH_CREATION',
            sourceId: batch.id,
          },
        });
      } catch (expError) {
        console.error('Auto-expense creation failed:', expError);
      }
    }

    return NextResponse.json({ message: 'Batch created', batch }, { status: 201 });
  } catch (error: any) {
    console.error('Batch creation error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A batch with this number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to create batch' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { batchId, ...updateData } = body;
    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    const data: any = { ...updateData };
    if (data.expectedReady && data.expectedReady.trim()) {
      data.expectedReady = new Date(data.expectedReady);
    } else if (data.expectedReady === '') {
      data.expectedReady = null;
    }
    if (data.acquisitionCost !== undefined) {
      data.acquisitionCost = data.acquisitionCost ? parseFloat(String(data.acquisitionCost)) : null;
    }

    const batch = await db.batch.update({ where: { id: batchId }, data });
    return NextResponse.json({ message: 'Batch updated', batch });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    await db.batch.delete({ where: { id: body.batchId } });
    return NextResponse.json({ message: 'Batch deleted' });
  } catch (error) {
    console.error('Batch deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 });
  }
}
