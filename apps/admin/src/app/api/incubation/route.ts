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

    const [batches, total] = await Promise.all([
      db.incubationBatch.findMany({
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      db.incubationBatch.count({}),
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
    console.error('Incubation batch fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incubation batches' },
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
      eggCount,
      startDate,
      expectedHatchDate,
      temperature,
      humidity,
      notes,
    } = body;

    if (!batchNumber || !eggCount || !startDate || !expectedHatchDate) {
      return NextResponse.json(
        { error: 'Missing required fields: batchNumber, eggCount, startDate, expectedHatchDate' },
        { status: 400 },
      );
    }

    const batch = await db.incubationBatch.create({
      data: {
        batchNumber,
        eggCount: parseInt(eggCount),
        startDate: new Date(startDate),
        expectedHatchDate: new Date(expectedHatchDate),
        notes: `Temperature: ${temperature || 'N/A'}, Humidity: ${humidity || 'N/A'}. ${notes || ''}`,
      },
    });

    return NextResponse.json(
      {
        message: 'Incubation batch created successfully',
        batch,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Incubation batch creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create incubation batch' },
      { status: 500 },
    );
  }
}
