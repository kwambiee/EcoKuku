import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [batches, total, eggsHatchedThisMonth] = await Promise.all([
      db.incubationBatch.findMany({
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      db.incubationBatch.count(),
      db.incubationBatch.aggregate({
        where: {
          hatchedCount: { gt: 0 },
          updatedAt: { gte: monthStart },
        },
        _sum: { hatchedCount: true },
      }),
    ]);

    // Compute next batch number: INC-DD/MM/YYYY-NN
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const todayPrefix = `INC-${dateStr}-`;
    const todaysCount = batches.filter((b: any) => String(b.batchNumber).startsWith(todayPrefix)).length;
    const nextNum = `${todayPrefix}${String(todaysCount + 1).padStart(2, '0')}`;

    return NextResponse.json({
      data: batches,
      stats: {
        eggsHatchedThisMonth: eggsHatchedThisMonth._sum.hatchedCount || 0,
        nextBatchNumber: nextNum,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Incubation batch fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch incubation batches' }, { status: 500 });
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
      batchNumber, eggCount, startDate, expectedHatchDate,
      temperature, humidity, eggSource, supplier, notes,
    } = body;

    if (!batchNumber || !eggCount || !startDate || !expectedHatchDate) {
      return NextResponse.json(
        { error: 'Missing required fields: batchNumber, eggCount, startDate, expectedHatchDate' },
        { status: 400 },
      );
    }

    const parsedTemp = temperature ? parseFloat(String(temperature)) : null;
    const parsedHumidity = humidity ? parseFloat(String(humidity)) : null;

    const batch = await db.incubationBatch.create({
      data: {
        batchNumber,
        eggCount: parseInt(String(eggCount)) || 0,
        startDate: new Date(startDate),
        expectedHatchDate: new Date(expectedHatchDate),
        ...(parsedTemp !== null && !isNaN(parsedTemp) && { temperature: parsedTemp }),
        ...(parsedHumidity !== null && !isNaN(parsedHumidity) && { humidity: parsedHumidity }),
        eggSource: eggSource || null,
        supplier: supplier || null,
        status: 'INCUBATING',
        notes: notes || null,
      },
    });

    return NextResponse.json({ message: 'Incubation batch created', batch }, { status: 201 });
  } catch (error: any) {
    console.error('Incubation batch creation error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A batch with this number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create incubation batch' }, { status: 500 });
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
      return NextResponse.json({ error: 'batchId required' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      // Delete linked farm batch if created from this incubation
      const linkedFarmBatch = await tx.batch.findFirst({
        where: { incubationBatchId: body.batchId },
        select: { id: true },
      });
      if (linkedFarmBatch) {
        const batchOrders = await tx.batchOrder.findMany({
          where: { batchId: linkedFarmBatch.id },
          select: { id: true },
        });
        const batchOrderIds = batchOrders.map((o: { id: string }) => o.id);
        if (batchOrderIds.length > 0) {
          await tx.batchOrderUpdate.deleteMany({ where: { batchOrderId: { in: batchOrderIds } } });
          await tx.batchOrder.deleteMany({ where: { id: { in: batchOrderIds } } });
        }
        await tx.batch.delete({ where: { id: linkedFarmBatch.id } });
      }
      await tx.incubationBatch.delete({ where: { id: body.batchId } });
    });
    return NextResponse.json({ message: 'Incubation batch deleted' });
  } catch (error) {
    console.error('Incubation batch delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
