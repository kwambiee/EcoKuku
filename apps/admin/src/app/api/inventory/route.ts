import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [products, feedStock] = await Promise.all([
      db.product.findMany({
        orderBy: { stock: 'asc' },
        select: { id: true, name: true, sku: true, category: true, type: true, stock: true, available: true, price: true },
      }),
      db.feedStock.findMany({
        include: { feedType: true },
      }),
    ]);

    return NextResponse.json({ products, feedStock });
  } catch (error) {
    console.error('Inventory API error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, stock, feedStockId, quantity } = body;

    if (productId) {
      const updated = await db.product.update({
        where: { id: productId },
        data: { stock: parseInt(stock) },
        select: { id: true, name: true, stock: true },
      });
      return NextResponse.json({ updated });
    }

    if (feedStockId) {
      const updated = await db.feedStock.update({
        where: { id: feedStockId },
        data: { quantity: parseFloat(quantity), lastUpdated: new Date() },
      });
      return NextResponse.json({ updated });
    }

    return NextResponse.json({ error: 'productId or feedStockId required' }, { status: 400 });
  } catch (error) {
    console.error('Inventory PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}
