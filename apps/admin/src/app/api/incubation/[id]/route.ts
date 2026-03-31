import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(adminAuthOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = params;
    const body = await request.json();
    const { hatchedCount, failedCount, notes } = body;

    if (hatchedCount === undefined || failedCount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: hatchedCount, failedCount' },
        { status: 400 },
      );
    }

    const batch = await db.incubationBatch.update({
      where: { id },
      data: {
        hatchedCount: parseInt(hatchedCount),
        failedCount: parseInt(failedCount),
        notes: notes || undefined,
      },
    });

    return NextResponse.json({
      message: 'Hatch results updated successfully',
      batch,
    });
  } catch (error) {
    console.error('Incubation batch update error:', error);
    return NextResponse.json(
      { error: 'Failed to update hatch results' },
      { status: 500 },
    );
  }
}
