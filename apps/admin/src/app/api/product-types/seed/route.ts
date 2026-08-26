import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

// All product types for Kwamboka Poultry Farm
// POST /api/product-types/seed — idempotent, skips existing entries
const FARM_PRODUCT_TYPES = [
  // ── Eggs ───────────────────────────────────────────────────────────────
  { name: 'KIENYEJI_TABLE_EGGS',    label: 'Kienyeji Table Eggs',              category: 'EGGS',         isDefault: true },
  // ── Hatching / Fertile eggs ────────────────────────────────────────────
  { name: 'HATCHING_EGGS_KARI',     label: 'Hatching Eggs — KARI Improved',    category: 'HATCHING_EGGS', isDefault: true },
  { name: 'HATCHING_EGGS_KIENYEJI', label: 'Hatching Eggs — Pure Kienyeji',    category: 'HATCHING_EGGS', isDefault: true },
  { name: 'HATCHING_EGGS_KC1',      label: 'Hatching Eggs — KC1',              category: 'HATCHING_EGGS', isDefault: true },
  { name: 'HATCHING_EGGS_KC2',      label: 'Hatching Eggs — KC2',              category: 'HATCHING_EGGS', isDefault: true },
  { name: 'HATCHING_EGGS_KC3',      label: 'Hatching Eggs — KC3',              category: 'HATCHING_EGGS', isDefault: true },
  // ── Live poultry ───────────────────────────────────────────────────────
  { name: 'LIVE_RAINBOW_ROOSTER',   label: 'Live Rainbow Rooster',             category: 'LIVE_POULTRY',  isDefault: true },
  { name: 'LIVE_IMPROVED_KIENYEJI', label: 'Live Improved Kienyeji',           category: 'LIVE_POULTRY',  isDefault: true },
  { name: 'LIVE_PURE_KIENYEJI',     label: 'Live Pure Kienyeji',               category: 'LIVE_POULTRY',  isDefault: true },
  // ── Dressed meat ──────────────────────────────────────────────────────
  { name: 'DRESSED_RAINBOW_ROOSTER',label: 'Dressed Rainbow Rooster',          category: 'DRESSED_MEAT',  isDefault: true },
  { name: 'DRESSED_KIENYEJI',       label: 'Dressed Kienyeji',                 category: 'DRESSED_MEAT',  isDefault: true },
  // ── Chicks ────────────────────────────────────────────────────────────
  { name: 'DOC_KARI',               label: 'Day-old Chicks — KARI Improved',   category: 'CHICKS',        isDefault: true },
  { name: 'DOC_RAINBOW_ROOSTER',    label: 'Day-old Chicks — Rainbow Rooster', category: 'CHICKS',        isDefault: true },
  { name: 'DOC_KIENYEJI',           label: 'Day-old Chicks — Pure Kienyeji',   category: 'CHICKS',        isDefault: true },
  // ── Feed ──────────────────────────────────────────────────────────────
  { name: 'CHICK_STARTER_MASH',     label: 'Chick Starter Mash',               category: 'FEED',          isDefault: true },
  { name: 'CHICK_STARTER_CRUMBS',   label: 'Chick Starter Crumbs',             category: 'FEED',          isDefault: true },
  { name: 'GROWERS_MASH',           label: 'Growers Mash',                     category: 'FEED',          isDefault: true },
  { name: 'LAYERS_MASH',            label: 'Layers Mash',                      category: 'FEED',          isDefault: true },
  { name: 'KIENYEJI_MASH',          label: 'Kienyeji Mash',                    category: 'FEED',          isDefault: true },
  // ── Services ──────────────────────────────────────────────────────────
  { name: 'VACCINATION_SERVICE',    label: 'Chick Vaccination Service',        category: 'SERVICES',      isDefault: true },
];

export async function POST() {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    let created = 0;
    let skipped = 0;

    for (const pt of FARM_PRODUCT_TYPES) {
      const existing = await db.productTypeConfig.findUnique({ where: { name: pt.name } });
      if (existing) { skipped++; continue; }
      await db.productTypeConfig.create({ data: pt });
      created++;
    }

    return NextResponse.json({
      message: `Seeded ${created} product types (${skipped} already existed).`,
      created,
      skipped,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
