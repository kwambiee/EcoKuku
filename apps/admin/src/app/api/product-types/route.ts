import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const types = await db.productTypeConfig.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ data: types });
  } catch (error) {
    console.error('Product types fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch product types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, label, category } = await request.json();
    if (!name || !label || !category) {
      return NextResponse.json({ error: 'name, label, and category are required' }, { status: 400 });
    }

    const typeConfig = await db.productTypeConfig.create({
      data: { name: name.toUpperCase().replace(/\s+/g, '_'), label, category },
    });
    return NextResponse.json({ typeConfig }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A product type with this name already exists' }, { status: 409 });
    }
    console.error('Product type create error:', error);
    return NextResponse.json({ error: 'Failed to create product type' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, label, category } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const typeConfig = await db.productTypeConfig.update({
      where: { id },
      data: {
        ...(label && { label }),
        ...(category && { category }),
      },
    });
    return NextResponse.json({ typeConfig });
  } catch (error) {
    console.error('Product type update error:', error);
    return NextResponse.json({ error: 'Failed to update product type' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const typeConfig = await db.productTypeConfig.findUnique({ where: { id } });
    if (!typeConfig) return NextResponse.json({ error: 'Type not found' }, { status: 404 });
    if (typeConfig.isDefault) return NextResponse.json({ error: 'Cannot delete default product types' }, { status: 400 });

    const productsUsingType = await db.product.count({ where: { type: typeConfig.name } });
    if (productsUsingType > 0) {
      return NextResponse.json({ error: `Cannot delete: ${productsUsingType} product(s) still use this type` }, { status: 400 });
    }

    await db.productTypeConfig.delete({ where: { id } });
    return NextResponse.json({ message: 'Product type deleted' });
  } catch (error) {
    console.error('Product type delete error:', error);
    return NextResponse.json({ error: 'Failed to delete product type' }, { status: 500 });
  }
}
