'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@ecokuku/ui';
import { Heart, Share2, Star, AlertCircle, Loader } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  type: string;
  availableStock: number;
  inStock: boolean;
  rating: number;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
  image?: string;
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/products/${params.slug}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError('Product not found');
          } else {
            throw new Error('Failed to fetch product');
          }
          return;
        }

        const data = await res.json();
        setProduct(data.data);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.slug]);

  const handleAddToCart = () => {
    if (!product) return;

    try {
      addItem({
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity,
      });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin" size={40} />
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-4">
            <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-800">{error || 'Product not found'}</p>
              <Link href="/shop" className="mt-4 inline-block text-red-600 hover:text-red-900 font-medium">
                ← Back to Shop
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const reviewCount = product.reviews?.length || 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-4 border-b">
        <div className="flex gap-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-gray-900">
            Shop
          </Link>
          <span>/</span>
          <span className="text-gray-900 truncate">{product.name}</span>
        </div>
      </div>

      {/* Product Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Image */}
          <div>
            <div className="bg-gray-100 rounded-lg p-8 aspect-square flex items-center justify-center mb-4">
              <div className="text-9xl">🥚</div>
            </div>
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

            {/* Category/Type */}
            <div className="flex gap-2 mb-4">
              <span className="inline-block bg-gray-100 px-3 py-1 rounded text-sm text-gray-700">
                {product.category}
              </span>
              <span className="inline-block bg-gray-100 px-3 py-1 rounded text-sm text-gray-700">
                {product.type}
              </span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={
                      i < Math.floor(product.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating.toFixed(1)} ({reviewCount} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="text-4xl font-bold text-green-600 mb-2">
              KSh {Number(product.price).toLocaleString()}
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {product.inStock ? (
                <span className="text-green-600 font-medium">
                  ✓ In Stock ({product.availableStock} available)
                </span>
              ) : (
                <span className="text-red-600 font-medium">Out of Stock</span>
              )}
            </div>

            {/* Description */}
            <p className="text-gray-700 mb-6 leading-relaxed">{product.description}</p>

            {/* Quantity & Add to Cart */}
            <div className="flex gap-4 mb-6">
              <div className="flex items-center gap-3 border border-gray-300 rounded-lg p-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1 hover:bg-gray-100"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1 hover:bg-gray-100"
                >
                  +
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="flex-1 bg-green-600 text-white hover:bg-green-700 text-lg py-3"
              >
                {addedToCart ? '✓ Added to Cart' : 'Add to Cart'}
              </Button>
            </div>

            {/* Share */}
            <div className="flex gap-4">
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2">
                <Heart size={20} /> Wishlist
              </button>
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2">
                <Share2 size={20} /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {reviewCount > 0 && (
          <div className="border-t pt-12">
            <h2 className="text-2xl font-bold mb-8">Customer Reviews ({reviewCount})</h2>
            <div className="space-y-6">
              {product.reviews.map((review) => (
                <div key={review.id} className="border-b pb-6 last:border-b-0">
                  <div className="flex justify-between mb-2">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About EcoKuku */}
        <div className="border-t mt-16 pt-12">
          <h2 className="text-2xl font-bold mb-6">About EcoKuku</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Farm to Table Quality</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Fresh products from our farm</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>No antibiotics or additives</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Ethical farming practices</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Fast delivery</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center">
              <p className="text-gray-600">Image placeholder</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
