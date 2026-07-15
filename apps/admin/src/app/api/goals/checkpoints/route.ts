import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

const STANDARD_CHECKPOINTS: Record<string, string[]> = {
  EGG_PRODUCTION: [
    'Feed given at consistent times (morning & evening)',
    'Correct feed quantity measured and given per bird',
    'Clean, fresh water available all day',
    'Lighting maintained for at least 16 hours per day',
    'Nest boxes clean, dry and sufficient in number',
    'Eggs collected 2–3 times daily to prevent breakage',
    'Broody hens identified and separated from flock',
    'No egg-eating behavior observed in the flock',
    'Hens active and showing normal behavior (not lethargic)',
  ],
  FEED_USAGE: [
    'Feed measured accurately at each feeding session',
    'Feeders not overfilled (reduces wastage)',
    'Feed stored in dry, covered containers off the ground',
    'Feed quality checked on each new delivery',
    'Feed consumption recorded for each session',
    'Stock reorder placed before running out',
    'Feed type appropriate for bird age and purpose',
  ],
  FLOCK_HEALTH: [
    'Morning health check done on all birds',
    'Evening health check done on all birds',
    'Sick or injured birds isolated immediately',
    'Dead birds removed and disposed of safely',
    'Foot dip at farm entrance refreshed and in use',
    'No unauthorized visitors in the poultry area',
    'Vaccinations checked and up to date',
    'Any unusual signs or symptoms noted and acted on',
  ],
  BROODER_CARE: [
    'Brooder temperature correct for chick age (35°C week 1, reduce 2–3°C/week)',
    'Chick starter feed available at all times',
    'Water clean and accessible with chick-appropriate drinkers',
    'Brooder litter dry — damp litter changed promptly',
    'Chicks not overcrowded — space increased as they grow',
    'Daily chick count done and recorded',
    'Weak or sick chicks separated for extra care',
  ],
  ORDER_FULFILLMENT: [
    'Delivery schedule planned before start of week',
    'Stock levels confirmed before accepting new orders',
    'Order confirmations sent to all customers',
    'Customer inquiries responded to within 24 hours',
    'Driver briefed on deliveries each day',
    'Returned or complained orders resolved promptly',
    'Packaging materials stocked and ready',
  ],
  // Monthly metric categories — no checklists needed
  REVENUE: [],
  EXPENSES: [],
  ORDERS: [],
  FLOCK_COUNT: [],
  EGG_VOLUME: [],
};

// POST — add a custom checkpoint
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { goalId, text } = body;
    if (!goalId || !text?.trim()) return NextResponse.json({ error: 'goalId and text required' }, { status: 400 });

    // Prevent duplicate custom checkpoints with same text
    const existing = await db.goalCheckpoint.findFirst({ where: { goalId, text: text.trim() } });
    if (existing) return NextResponse.json({ message: 'Already exists', checkpoint: existing });

    const maxOrder = await db.goalCheckpoint.findFirst({ where: { goalId }, orderBy: { order: 'desc' }, select: { order: true } });
    const checkpoint = await db.goalCheckpoint.create({
      data: { goalId, text: text.trim(), isCustom: true, checked: false, order: (maxOrder?.order ?? 0) + 1 },
    });
    return NextResponse.json({ message: 'Checkpoint added', checkpoint }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}

// PATCH — seed, toggle checked, or update item feedback
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Seed standard checkpoints (with deduplication cleanup)
    if (body.action === 'seed') {
      const { goalId, category } = body;
      if (!goalId || !category) return NextResponse.json({ error: 'goalId and category required' }, { status: 400 });

      // Deduplicate any existing standard checkpoints first
      const allStandard = await db.goalCheckpoint.findMany({
        where: { goalId, isCustom: false },
        orderBy: { createdAt: 'asc' },
      });
      const seen = new Set<string>();
      const toDelete: string[] = [];
      for (const cp of allStandard) {
        if (seen.has(cp.text)) toDelete.push(cp.id);
        else seen.add(cp.text);
      }
      if (toDelete.length > 0) {
        await db.goalCheckpoint.deleteMany({ where: { id: { in: toDelete } } });
      }

      // Create any missing standard checkpoints
      const items = STANDARD_CHECKPOINTS[category] ?? [];
      const existingTexts = new Set(allStandard.filter((c) => !toDelete.includes(c.id)).map((c) => c.text));
      for (const [i, text] of items.entries()) {
        if (!existingTexts.has(text)) {
          await db.goalCheckpoint.create({
            data: { goalId, text, isCustom: false, checked: false, order: i },
          });
        }
      }

      const checkpoints = await db.goalCheckpoint.findMany({ where: { goalId }, orderBy: { order: 'asc' } });
      return NextResponse.json({ message: 'Seeded', checkpoints });
    }

    // Update item feedback (positives, challenges, improvements)
    if (body.action === 'feedback') {
      const { checkpointId, positives, challenges, improvements } = body;
      if (!checkpointId) return NextResponse.json({ error: 'checkpointId required' }, { status: 400 });

      const cp = await db.goalCheckpoint.update({
        where: { id: checkpointId },
        data: {
          positives: positives ?? null,
          challenges: challenges ?? null,
          improvements: improvements ?? null,
        },
      });
      return NextResponse.json({ message: 'Feedback saved', checkpoint: cp });
    }

    // Toggle checked
    const { checkpointId, checked } = body;
    if (!checkpointId || checked === undefined) return NextResponse.json({ error: 'checkpointId and checked required' }, { status: 400 });

    const cp = await db.goalCheckpoint.update({ where: { id: checkpointId }, data: { checked } });
    return NextResponse.json({ message: 'Updated', checkpoint: cp });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}

// DELETE — remove a checkpoint
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { checkpointId } = await request.json();
    if (!checkpointId) return NextResponse.json({ error: 'checkpointId required' }, { status: 400 });

    await db.goalCheckpoint.delete({ where: { id: checkpointId } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}
