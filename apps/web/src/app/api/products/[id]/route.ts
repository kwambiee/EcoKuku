import { NextRequest, NextResponse } from 'next/server';
import { db } from '@ecokuku/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const product = await db.product.findUnique({
      where: { id },
      include: {
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate average rating
    const avgRating = 
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
        : 0;

    return NextResponse.json({
      data: {
        ...product,
        availableStock: product.stock,
        inStock: product.stock > 0,
        rating: parseFloat(avgRating.toFixed(1)),
        reviews: product.reviews,
      },
    });
  } catch (error) {
    console.error('Product detail fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
