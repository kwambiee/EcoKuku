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
      db.mortalityLog.findMany({
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
      db.mortalityLog.count({ where }),
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
    console.error('Mortality logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mortality logs' },
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
      count,
      cause,
      notes,
    } = body;

    if (!batchId || !date || count === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: batchId, date, count' },
        { status: 400 },
      );
    }

    const log = await db.mortalityLog.create({
      data: {
        batchId,
        date: new Date(date),
        count: parseInt(count),
        cause,
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
        message: 'Mortality log created successfully',
        log,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Mortality log creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create mortality log' },
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
    const { mortalityLogId, ...updateData } = body;

    if (!mortalityLogId) {
      return NextResponse.json(
        { error: 'Mortality log ID is required' },
        { status: 400 },
      );
    }

    const log = await db.mortalityLog.update({
      where: { id: mortalityLogId },
      data: updateData,
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Mortality log updated successfully',
      log,
    });
  } catch (error) {
    console.error('Mortality log update error:', error);
    return NextResponse.json(
      { error: 'Failed to update mortality log' },
      { status: 500 },
    );
  }
}
