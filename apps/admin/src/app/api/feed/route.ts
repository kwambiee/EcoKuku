import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

// GET: all feed types with their current stock levels + recent consumption + recent purchases
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [feedTypes, recentLogs, recentPurchases] = await Promise.all([
      db.feedType.findMany({
        include: { stock: true },
        orderBy: { name: 'asc' },
      }),
      db.feedLog.findMany({
        orderBy: { recordedDate: 'desc' },
        take: 50,
      }),
      db.feedPurchase.findMany({
        include: { feedType: true },
        orderBy: { date: 'desc' },
        take: 20,
      }),
    ]);

    // Compute daily average consumption per feed type (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const recentByType: Record<string, number[]> = {};
    for (const log of recentLogs) {
      if (new Date(log.recordedDate) >= sevenDaysAgo) {
        if (!recentByType[log.feedType]) recentByType[log.feedType] = [];
        recentByType[log.feedType].push(Number(log.quantityUsed));
      }
    }

    const inventory = feedTypes.map((ft) => {
      const stock = ft.stock.reduce((s, st) => s + Number(st.quantity), 0);
      const dailyLogs = recentByType[ft.name] || [];
      const dailyAvg = dailyLogs.length > 0
        ? dailyLogs.reduce((s, v) => s + v, 0) / Math.min(7, dailyLogs.length)
        : 0;
      const daysRemaining = dailyAvg > 0 ? Math.floor(stock / dailyAvg) : null;

      return {
        id: ft.id,
        name: ft.name,
        supplier: ft.supplier,
        costPerUnit: Number(ft.cost || 0),
        totalStock: stock,
        unit: ft.stock[0]?.unit || 'kg',
        dailyAvgConsumption: Math.round(dailyAvg * 10) / 10,
        daysRemaining,
        isLow: daysRemaining !== null && daysRemaining < 7,
      };
    });

    return NextResponse.json({ inventory, recentLogs, recentPurchases });
  } catch (error) {
    console.error('Feed GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch feed data' }, { status: 500 });
  }
}

// POST: create feed type, restock, log consumption, or record purchase
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    if (action === 'create_type') {
      const { name, supplier, cost } = body;
      if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

      const feedType = await db.feedType.create({
        data: {
          name,
          supplier: supplier || null,
          cost: cost ? parseFloat(cost) : null,
          stock: { create: { quantity: 0, unit: 'kg' } },
        },
      });
      return NextResponse.json({ feedType }, { status: 201 });
    }

    if (action === 'restock') {
      const { feedTypeId, quantity, unit, supplier } = body;
      if (!feedTypeId || !quantity) return NextResponse.json({ error: 'feedTypeId and quantity required' }, { status: 400 });

      // Get existing stock record
      const existing = await db.feedStock.findFirst({ where: { feedTypeId } });
      if (existing) {
        await db.feedStock.update({
          where: { id: existing.id },
          data: { quantity: { increment: parseFloat(quantity) }, lastUpdated: new Date() },
        });
      } else {
        await db.feedStock.create({
          data: { feedTypeId, quantity: parseFloat(quantity), unit: unit || 'kg' },
        });
      }

      if (supplier) {
        await db.feedType.update({ where: { id: feedTypeId }, data: { supplier } });
      }

      return NextResponse.json({ message: 'Stock updated' });
    }

    if (action === 'purchase') {
      const {
        feedTypeId, date, quantity, supplierName, supplierContact,
        purchasePrice, transportCost, receiptRef, notes,
      } = body;

      if (!feedTypeId || !quantity || !supplierName || !purchasePrice) {
        return NextResponse.json({ error: 'feedTypeId, quantity, supplierName, and purchasePrice are required' }, { status: 400 });
      }

      const qty = parseFloat(quantity);
      const price = parseFloat(purchasePrice);
      const transport = parseFloat(transportCost || '0');
      const total = price + transport;

      // Get the feed type name for the expense description
      const feedType = await db.feedType.findUnique({ where: { id: feedTypeId } });
      if (!feedType) return NextResponse.json({ error: 'Feed type not found' }, { status: 404 });

      // Create the purchase record
      const purchase = await db.feedPurchase.create({
        data: {
          feedTypeId,
          date: date ? new Date(date) : new Date(),
          quantity: qty,
          unit: 'kg',
          supplierName,
          supplierContact: supplierContact || null,
          purchasePrice: price,
          transportCost: transport,
          totalCost: total,
          receiptRef: receiptRef || null,
          notes: notes || null,
        },
      });

      // Increment FeedStock quantity (same as restock logic)
      const existingStock = await db.feedStock.findFirst({ where: { feedTypeId } });
      if (existingStock) {
        await db.feedStock.update({
          where: { id: existingStock.id },
          data: { quantity: { increment: qty }, lastUpdated: new Date() },
        });
      } else {
        await db.feedStock.create({
          data: { feedTypeId, quantity: qty, unit: 'kg' },
        });
      }

      // Update supplier on feed type
      await db.feedType.update({ where: { id: feedTypeId }, data: { supplier: supplierName } });

      // Auto-create an Expense record
      const description = `Feed purchase: ${qty}kg ${feedType.name} from ${supplierName}`;
      await db.expense.create({
        data: {
          category: 'FEED',
          description,
          amount: total,
          vendor: supplierName,
          date: date ? new Date(date) : new Date(),
          sourceType: 'FEED_PURCHASE',
          sourceId: purchase.id,
        },
      });

      return NextResponse.json({ purchase }, { status: 201 });
    }

    if (action === 'log_consumption') {
      const { feedTypeName, quantityUsed, batchId, notes } = body;
      if (!feedTypeName || !quantityUsed) return NextResponse.json({ error: 'feedTypeName and quantityUsed required' }, { status: 400 });

      // Deduct from stock
      const feedType = await db.feedType.findFirst({ where: { name: feedTypeName }, include: { stock: true } });
      if (feedType?.stock[0]) {
        const newQty = Math.max(0, Number(feedType.stock[0].quantity) - parseFloat(quantityUsed));
        await db.feedStock.update({
          where: { id: feedType.stock[0].id },
          data: { quantity: newQty, lastUpdated: new Date() },
        });
      }

      const log = await db.feedLog.create({
        data: {
          feedType: feedTypeName,
          quantityUsed: parseFloat(quantityUsed),
          quantityRemaining: feedType?.stock[0] ? Math.max(0, Number(feedType.stock[0].quantity) - parseFloat(quantityUsed)) : null,
          batchId: batchId || null,
          notes: notes || null,
          recordedDate: new Date(),
        },
      });

      return NextResponse.json({ log }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Feed POST error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process request' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.feedTypeId) return NextResponse.json({ error: 'feedTypeId required' }, { status: 400 });

    await db.feedType.delete({ where: { id: body.feedTypeId } });
    return NextResponse.json({ message: 'Feed type deleted' });
  } catch (error) {
    console.error('Feed DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
