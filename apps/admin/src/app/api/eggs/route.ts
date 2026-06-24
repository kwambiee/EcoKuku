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
    const batchId = searchParams.get('batchId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (batchId) where.batchId = batchId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);
    const twoWeeksAgo = new Date(todayStart.getTime() - 14 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      eggs, total,
      todayAgg, yesterdayAgg,
      thisWeekAgg, lastWeekAgg,
      monthAgg,
      last30Days,
      layerBatches,
      allTimeAgg,
      eggsSold,
    ] = await Promise.all([
      db.eggProduction.findMany({
        where, skip, take: limit,
        include: { batch: { select: { id: true, batchNumber: true } } },
        orderBy: { date: 'desc' },
      }),
      db.eggProduction.count({ where }),
      db.eggProduction.aggregate({ where: { date: { gte: todayStart } }, _sum: { collected: true, broken: true, cracked: true } }),
      db.eggProduction.aggregate({ where: { date: { gte: yesterdayStart, lt: todayStart } }, _sum: { collected: true, broken: true, cracked: true } }),
      db.eggProduction.aggregate({ where: { date: { gte: weekAgo } }, _sum: { collected: true, broken: true, cracked: true } }),
      db.eggProduction.aggregate({ where: { date: { gte: twoWeeksAgo, lt: weekAgo } }, _sum: { collected: true, broken: true, cracked: true } }),
      db.eggProduction.aggregate({ where: { date: { gte: monthStart } }, _sum: { collected: true, broken: true, cracked: true } }),
      db.eggProduction.findMany({
        where: { date: { gte: new Date(todayStart.getTime() - 30 * 86400000) } },
        select: { date: true, collected: true, broken: true, cracked: true },
        orderBy: { date: 'asc' },
      }),
      db.batch.findMany({
        where: { status: 'ACTIVE', type: 'LAYER' },
        select: { currentCount: true },
      }),
      // Total good eggs ever produced
      db.eggProduction.aggregate({ _sum: { collected: true, broken: true, cracked: true } }),
      // Total eggs sold (order items for egg products)
      db.orderItem.aggregate({
        where: {
          product: { category: 'EGGS' },
          order: { status: { notIn: ['CANCELLED', 'FAILED'] } },
        },
        _sum: { quantity: true },
      }),
    ]);

    const todayCollected = todayAgg._sum.collected || 0;
    const todayBroken = (todayAgg._sum.broken || 0) + (todayAgg._sum.cracked || 0);
    const yesterdayCollected = yesterdayAgg._sum.collected || 0;

    const weekCollected = thisWeekAgg._sum.collected || 0;
    const weekDamaged = (thisWeekAgg._sum.broken || 0) + (thisWeekAgg._sum.cracked || 0);
    const weekGood = weekCollected - weekDamaged;
    const qualityRate = weekCollected > 0 ? ((weekGood / weekCollected) * 100).toFixed(1) : '0';

    const lastWeekCollected = lastWeekAgg._sum.collected || 0;
    const weekTrend = lastWeekCollected > 0
      ? Math.round(((weekCollected - lastWeekCollected) / lastWeekCollected) * 100)
      : null;
    const trendAlert = weekTrend !== null && weekTrend < -10;

    const totalLayers = layerBatches.reduce((s, b) => s + b.currentCount, 0);
    const layingRate = totalLayers > 0 && todayCollected > 0
      ? ((todayCollected / totalLayers) * 100).toFixed(1)
      : null;

    // Eggs in store = total good eggs produced - total eggs sold
    const totalProduced = (allTimeAgg._sum.collected || 0) - (allTimeAgg._sum.broken || 0) - (allTimeAgg._sum.cracked || 0);
    const totalSold = eggsSold._sum.quantity || 0;
    const eggsInStore = Math.max(0, totalProduced - totalSold);

    const dailyAvg7d = weekCollected > 0 ? Math.round(weekCollected / 7) : 0;

    const monthCollected = monthAgg._sum.collected || 0;

    // Daily chart data (last 30 days)
    const dailyMap: Record<string, { collected: number; broken: number; cracked: number }> = {};
    for (const rec of last30Days) {
      const dayKey = new Date(rec.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { collected: 0, broken: 0, cracked: 0 };
      dailyMap[dayKey].collected += rec.collected;
      dailyMap[dayKey].broken += rec.broken || 0;
      dailyMap[dayKey].cracked += rec.cracked || 0;
    }
    const dailyChart = Object.entries(dailyMap).map(([day, vals]) => ({
      day,
      collected: vals.collected,
      good: vals.collected - vals.broken - vals.cracked,
      damaged: vals.broken + vals.cracked,
    }));

    // Weekly bar chart data (last 8 weeks)
    const weeklyBars: { week: string; good: number; broken: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const wStart = new Date(todayStart.getTime() - (w + 1) * 7 * 86400000);
      const wEnd = new Date(todayStart.getTime() - w * 7 * 86400000);
      const wRecords = last30Days.filter((r) => {
        const d = new Date(r.date);
        return d >= wStart && d < wEnd;
      });
      const wCollected = wRecords.reduce((s, r) => s + r.collected, 0);
      const wDamaged = wRecords.reduce((s, r) => s + (r.broken || 0) + (r.cracked || 0), 0);
      if (wCollected > 0) {
        weeklyBars.push({
          week: wStart.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
          good: wCollected - wDamaged,
          broken: wDamaged,
        });
      }
    }

    return NextResponse.json({
      data: eggs,
      stats: {
        todayCollected,
        todayBroken,
        yesterdayCollected,
        eggsDiff: yesterdayCollected > 0 ? todayCollected - yesterdayCollected : null,
        dailyAvg7d,
        qualityRate,
        weekTrend,
        trendAlert,
        layingRate,
        totalLayers,
        eggsInStore,
        totalProduced,
        totalSold,
        monthCollected,
      },
      charts: {
        daily: dailyChart,
        weekly: weeklyBars,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Egg production fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch egg production records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, collected, broken, cracked, eggSize, collectionTime, collectedBy, storageLocation, notes, batchId } = body;

    if (!date || collected === undefined) {
      return NextResponse.json({ error: 'Missing required fields: date, collected' }, { status: 400 });
    }

    const egg = await db.eggProduction.create({
      data: {
        date: new Date(date),
        collected: parseInt(String(collected)) || 0,
        broken: parseInt(String(broken || 0)) || 0,
        cracked: parseInt(String(cracked || 0)) || 0,
        eggSize: eggSize || null,
        collectionTime: collectionTime || null,
        collectedBy: collectedBy || null,
        storageLocation: storageLocation || null,
        notes: notes || null,
        ...(batchId && { batchId }),
      },
      include: { batch: { select: { id: true, batchNumber: true } } },
    });

    return NextResponse.json({ message: 'Egg production record created', egg }, { status: 201 });
  } catch (error) {
    console.error('Egg production creation error:', error);
    return NextResponse.json({ error: 'Failed to create egg production record' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eggProductionId, date, collected, broken, cracked, eggSize, collectionTime, collectedBy, storageLocation, notes, batchId } = body;

    if (!eggProductionId) {
      return NextResponse.json({ error: 'Egg production record ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (collected !== undefined) updateData.collected = parseInt(String(collected)) || 0;
    if (broken !== undefined) updateData.broken = parseInt(String(broken)) || 0;
    if (cracked !== undefined) updateData.cracked = parseInt(String(cracked)) || 0;
    if (eggSize !== undefined) updateData.eggSize = eggSize || null;
    if (collectionTime !== undefined) updateData.collectionTime = collectionTime || null;
    if (collectedBy !== undefined) updateData.collectedBy = collectedBy || null;
    if (storageLocation !== undefined) updateData.storageLocation = storageLocation || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (batchId !== undefined) updateData.batchId = batchId || null;

    const egg = await db.eggProduction.update({
      where: { id: eggProductionId },
      data: updateData,
      include: { batch: { select: { id: true, batchNumber: true } } },
    });

    return NextResponse.json({ message: 'Updated', egg });
  } catch (error) {
    console.error('Egg production update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.eggProductionId) {
      return NextResponse.json({ error: 'Egg production record ID is required' }, { status: 400 });
    }

    await db.eggProduction.delete({ where: { id: body.eggProductionId } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Egg production deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
