import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const type = searchParams.get('type');
    const where: any = {};
    if (type) where.type = type;

    const [products, total, allTimeEggs, eggsSold, activeBatches] = await Promise.all([
      db.product.findMany({ where, take: limit, orderBy: { createdAt: 'desc' } }),
      db.product.count({ where }),
      db.eggProduction.aggregate({ _sum: { collected: true, broken: true, cracked: true } }),
      db.orderItem.aggregate({
        where: { product: { category: 'EGGS' }, order: { status: { notIn: ['CANCELLED', 'FAILED'] } } },
        _sum: { quantity: true },
      }),
      db.batch.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, batchNumber: true, type: true, currentCount: true },
      }),
    ]);

    const goodEggsProduced = (allTimeEggs._sum.collected || 0) - (allTimeEggs._sum.broken || 0) - (allTimeEggs._sum.cracked || 0);
    const totalEggsSold = eggsSold._sum.quantity || 0;
    const eggsInStore = Math.max(0, goodEggsProduced - totalEggsSold);

    const liveBirdsByType: Record<string, number> = {};
    let totalLiveBirds = 0;
    for (const b of activeBatches) {
      const key = b.type;
      liveBirdsByType[key] = (liveBirdsByType[key] || 0) + b.currentCount;
      totalLiveBirds += b.currentCount;
    }

    const lowStockProducts = products.filter((p) => p.stock <= p.reorderLevel && p.status !== 'out_of_stock');

    return NextResponse.json({
      data: products,
      pagination: { total, pages: 1 },
      inventory: {
        eggsInStore,
        goodEggsProduced,
        totalEggsSold,
        totalLiveBirds,
        liveBirdsByType,
        lowStockProducts: lowStockProducts.length,
      },
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      name, description, price, type, category, stock, available,
      wholesalePrice, image, unit, status, visibleInStore, reorderLevel, minOrderQty,
    } = body;

    if (!name || !price || !type || !category || !description) {
      return NextResponse.json({ error: 'Missing required fields: name, description, price, type, category' }, { status: 400 });
    }

    const sku = `SKU-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;

    const product = await db.product.create({
      data: {
        sku, name, description,
        price: parseFloat(price),
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
        type, category,
        unit: unit || 'per unit',
        stock: parseInt(String(stock)) || 0,
        available: available !== false,
        status: status || 'available',
        visibleInStore: visibleInStore !== false,
        reorderLevel: parseInt(String(reorderLevel)) || 10,
        minOrderQty: minOrderQty ? parseInt(String(minOrderQty)) : null,
        image: image || null,
      },
    });

    return NextResponse.json({ message: 'Product created', product }, { status: 201 });
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { productId, ...updateData } = body;
    if (!productId) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });

    if (updateData.price !== undefined) updateData.price = parseFloat(updateData.price);
    if (updateData.wholesalePrice !== undefined) updateData.wholesalePrice = updateData.wholesalePrice ? parseFloat(updateData.wholesalePrice) : null;
    if (updateData.stock !== undefined) updateData.stock = parseInt(String(updateData.stock)) || 0;
    if (updateData.reorderLevel !== undefined) updateData.reorderLevel = parseInt(String(updateData.reorderLevel)) || 10;
    if (updateData.minOrderQty !== undefined) updateData.minOrderQty = updateData.minOrderQty ? parseInt(String(updateData.minOrderQty)) : null;

    const product = await db.product.update({ where: { id: productId }, data: updateData });
    return NextResponse.json({ message: 'Product updated', product });
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.productId) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });

    await db.product.delete({ where: { id: body.productId } });
    return NextResponse.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Product deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
