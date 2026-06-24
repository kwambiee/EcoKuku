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
      db.vaccination.findMany({
        where,
        skip,
        take: limit,
        include: {
          batch: {
            select: { id: true, batchNumber: true },
          },
        },
        orderBy: { dateAdministered: 'desc' },
      }),
      db.vaccination.count({ where }),
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
    console.error('Health logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health logs' },
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
      vaccineType,
      dateAdministered,
      dosage,
      administeredBy,
      batchNo,
      notes,
      cost,
    } = body;

    if (!vaccineType || !dateAdministered) {
      return NextResponse.json(
        { error: 'Missing required fields: vaccineType, dateAdministered' },
        { status: 400 },
      );
    }

    const log = await db.vaccination.create({
      data: {
        batchId: batchId || null,
        vaccineType,
        dateAdministered: new Date(dateAdministered),
        dosage,
        administeredBy,
        batchNo: batchNo || null,
        notes,
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
      },
    });

    // Notify customers with active batch orders for this batch
    if (batchId) {
      const activeBatchOrders = await db.batchOrder.findMany({
        where: { batchId, status: { in: ['CONFIRMED', 'GROWING'] } },
        select: { id: true },
      });

      if (activeBatchOrders.length > 0) {
        const vaccineDate = new Date(dateAdministered).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
        await db.batchOrderUpdate.createMany({
          data: activeBatchOrders.map((bo) => ({
            batchOrderId: bo.id,
            title: `${vaccineType} vaccination completed`,
            message: `Your batch received the ${vaccineType} vaccination on ${vaccineDate}.${dosage ? ` Dosage: ${dosage}.` : ''}`,
            type: 'MILESTONE',
          })),
        });
      }
    }

    if (cost && parseFloat(cost) > 0) {
      await db.expense.create({
        data: {
          category: 'MEDICINE_VACCINE',
          description: `${vaccineType} vaccination${log.batch ? ` for batch ${log.batch.batchNumber}` : ''}`,
          amount: parseFloat(cost),
          date: new Date(dateAdministered),
          sourceType: 'VACCINATION',
          sourceId: log.id,
        },
      });
    }

    return NextResponse.json(
      {
        message: 'Vaccination record created successfully',
        log,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Vaccination record creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create vaccination record' },
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
    const { vaccinationId, ...updateData } = body;

    if (!vaccinationId) {
      return NextResponse.json(
        { error: 'Vaccination ID is required' },
        { status: 400 },
      );
    }

    const log = await db.vaccination.update({
      where: { id: vaccinationId },
      data: updateData,
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Vaccination log updated successfully',
      log,
    });
  } catch (error) {
    console.error('Vaccination log update error:', error);
    return NextResponse.json(
      { error: 'Failed to update vaccination log' },
      { status: 500 },
    );
  }
}
