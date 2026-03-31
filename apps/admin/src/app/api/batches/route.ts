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
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [batches, total] = await Promise.all([
      db.batch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      db.batch.count({ where }),
    ]);

    return NextResponse.json({
      data: batches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Batches fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
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
      batchNumber,
      type,
      quantity,
      startDate,
      notes,
    } = body;

    if (!batchNumber || !type || !quantity || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const batch = await db.batch.create({
      data: {
        batchNumber,
        type,
        quantity,
        startDate: new Date(startDate),
        status: 'ACTIVE',
        notes,
      },
    });

    return NextResponse.json(
      {
        message: 'Batch created successfully',
        batch,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Batch creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
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
    const { batchId, ...updateData } = body;

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 },
      );
    }

    const batch = await db.batch.update({
      where: { id: batchId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Batch updated successfully',
      batch,
    });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json(
      { error: 'Failed to update batch' },
      { status: 500 },
    );
  }
}
