import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const batchId = searchParams.get('batchId');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (batchId) {
      where.batchId = batchId;
    }

    const [logs, total] = await Promise.all([
      db.growthLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          batch: {
            select: { id: true, batchNumber: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
      db.growthLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Growth logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth logs' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      batchId,
      date,
      avgWeight,
      notes,
    } = body;

    if (!batchId || !date || avgWeight === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: batchId, date, avgWeight' },
        { status: 400 },
      );
    }

    const log = await db.growthLog.create({
      data: {
        batchId,
        date: new Date(date),
        avgWeight: parseFloat(avgWeight),
        notes,
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Growth log created successfully',
        log,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Growth log creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create growth log' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { growthLogId, ...updateData } = body;

    if (!growthLogId) {
      return NextResponse.json(
        { error: 'Growth log ID is required' },
        { status: 400 },
      );
    }

    const log = await db.growthLog.update({
      where: { id: growthLogId },
      data: updateData,
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Growth log updated successfully',
      log,
    });
  } catch (error) {
    console.error('Growth log update error:', error);
    return NextResponse.json(
      { error: 'Failed to update growth log' },
      { status: 500 },
    );
  }
}
