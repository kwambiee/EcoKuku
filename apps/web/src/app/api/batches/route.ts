import { NextRequest, NextResponse } from 'next/server';
import { db } from '@ecokuku/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    const where: any = {
      isOpenForBooking: true,
      status: 'ACTIVE',
    };

    if (type) where.type = type;

    const batches = await db.batch.findMany({
      where,
      select: {
        id: true,
        batchNumber: true,
        type: true,
        breed: true,
        startDate: true,
        expectedReady: true,
        quantity: true,
        currentCount: true,
        maxBookings: true,
        bookedCount: true,
        pricePerChick: true,
        notes: true,
        vaccinations: {
          orderBy: { dateAdministered: 'desc' },
          take: 1,
          select: { vaccineType: true, dateAdministered: true },
        },
        growthLogs: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { avgWeight: true, date: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const enriched = batches.map((b) => ({
      ...b,
      ageInDays: Math.floor((Date.now() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24)),
      availableSpots: b.maxBookings != null ? Math.max(0, b.maxBookings - b.bookedCount) : null,
    }));

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error('Batches fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}
