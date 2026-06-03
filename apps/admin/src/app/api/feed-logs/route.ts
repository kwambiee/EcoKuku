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

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      db.feedLog.findMany({
        skip,
        take: limit,
        orderBy: { recordedDate: 'desc' },
      }),
      db.feedLog.count({}),
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
    console.error('Feed logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed logs' },
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
      recordedDate,
      feedType,
      quantityUsed,
      quantityRemaining,
      supplier,
      notes,
    } = body;

    if (!recordedDate || !feedType || quantityUsed === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const log = await db.feedLog.create({
      data: {
        recordedDate: new Date(recordedDate),
        feedType,
        quantityUsed: parseFloat(quantityUsed),
        quantityRemaining: quantityRemaining ? parseFloat(quantityRemaining) : null,
        supplier,
        notes,
      },
    });

    return NextResponse.json(
      {
        message: 'Feed log created successfully',
        log,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Feed log creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create feed log' },
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
    const { feedLogId, ...updateData } = body;

    if (!feedLogId) {
      return NextResponse.json(
        { error: 'Feed log ID is required' },
        { status: 400 },
      );
    }

    const log = await db.feedLog.update({
      where: { id: feedLogId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Feed log updated successfully',
      log,
    });
  } catch (error) {
    console.error('Feed log update error:', error);
    return NextResponse.json(
      { error: 'Failed to update feed log' },
      { status: 500 },
    );
  }
}
