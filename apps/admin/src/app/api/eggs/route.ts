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

    const [eggs, total] = await Promise.all([
      db.eggProduction.findMany({
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
      db.eggProduction.count({ where }),
    ]);

    return NextResponse.json({
      data: eggs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Egg production fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch egg production records' },
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
      date,
      collected,
      broken,
      cracked,
      notes,
      batchId,
    } = body;

    if (!date || collected === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: date, collected' },
        { status: 400 },
      );
    }

    const egg = await db.eggProduction.create({
      data: {
        date: new Date(date),
        collected: parseInt(collected),
        broken: broken ? parseInt(broken) : 0,
        cracked: cracked ? parseInt(cracked) : 0,
        notes,
        ...(batchId && { batchId }),
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Egg production record created successfully',
        egg,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Egg production creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create egg production record' },
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
    const { eggProductionId, ...updateData } = body;

    if (!eggProductionId) {
      return NextResponse.json(
        { error: 'Egg production record ID is required' },
        { status: 400 },
      );
    }

    const egg = await db.eggProduction.update({
      where: { id: eggProductionId },
      data: updateData,
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Egg production record updated successfully',
        egg,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Egg production update error:', error);
    return NextResponse.json(
      { error: 'Failed to update egg production record' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { eggProductionId } = body;

    if (!eggProductionId) {
      return NextResponse.json(
        { error: 'Egg production record ID is required' },
        { status: 400 },
      );
    }

    await db.eggProduction.delete({
      where: { id: eggProductionId },
    });

    return NextResponse.json(
      { message: 'Egg production record deleted successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Egg production deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete egg production record' },
      { status: 500 },
    );
  }
}
