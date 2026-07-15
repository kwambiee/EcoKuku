import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { goalId, period, status, positives, challenges, notes } = body;

    if (!goalId || !period || !status) {
      return NextResponse.json({ error: 'goalId, period, status required' }, { status: 400 });
    }

    const review = await db.goalReview.upsert({
      where: { goalId_period: { goalId, period } },
      create: {
        goalId,
        period,
        status,
        positives: positives || null,
        challenges: challenges || null,
        notes: notes || null,
      },
      update: {
        status,
        positives: positives || null,
        challenges: challenges || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ message: 'Review saved', review });
  } catch (error: any) {
    console.error('Review save error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save review' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { reviewId } = await request.json();
    if (!reviewId) return NextResponse.json({ error: 'reviewId required' }, { status: 400 });

    await db.goalReview.delete({ where: { id: reviewId } });
    return NextResponse.json({ message: 'Review deleted' });
  } catch (error: any) {
    console.error('Review delete error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete review' }, { status: 500 });
  }
}
