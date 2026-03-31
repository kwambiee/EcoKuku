'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Badge } from '@ecokuku/ui';
import { formatCurrency } from '@ecokuku/ui';
import { useCart } from '@/hooks/useCart';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  category: string;
  stockQuantity: number;
  isAvailable: boolean;
  image?: string;
  createdAt: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    // Fetch product by slug
    const fetchProduct = async () => {
      try {
        // This would require a dynamic route in your API
        // For now, using a placeholder
        console.log('Fetching product:', slug);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching product:', error);
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (product) {
      addItem({
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image,
        category: product.category,
      });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle review submission
    console.log('Submitting review:', newReview);
    setNewReview({ rating: 5, comment: '' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <Link href="/shop">
            <Button>Back to Shop</Button>
          </Link>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-8 text-sm font-medium text-gray-600">
          <Link href="/shop" className="text-green-900 hover:text-green-800">Shop</Link>
          <span className="mx-2">/</span>
          <span>{product.category}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Image */}
          <div className="bg-white rounded-lg p-8 border border-gray-200">
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {product.image && (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              )}
              {!product.isAvailable && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <p className="text-white font-bold text-lg">Out of Stock</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                <Badge variant="secondary">{product.type}</Badge>
              </div>
              <p className="text-gray-600">{product.category}</p>
            </div>

            {/* Rating */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < Math.round(Number(avgRating)) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-900">{avgRating}</span>
                <span className="text-gray-600">({reviews.length} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="border-t border-b border-gray-200 py-4">
              <p className="text-4xl font-bold text-green-900">{formatCurrency(product.price)}</p>
              <p className="text-sm text-gray-600 mt-1">Per unit</p>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Stock Status */}
            <div>
              <p className="text-sm text-gray-600">
                {product.stockQuantity > 0
                  ? `${product.stockQuantity} in stock`
                  : 'Out of stock'}
              </p>
            </div>

            {/* Add to Cart */}
            {product.isAvailable && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center border-0 py-2 text-sm font-semibold"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleAddToCart}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

            {reviews.length === 0 ? (
              <p className="text-gray-600">No reviews yet. Be the first to review!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900">{review.userName}</p>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{review.comment}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit">
            <h3 className="font-bold text-gray-900 mb-4">Leave a Review</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        size={24}
                        className={
                          star <= newReview.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Comment
                </label>
                <textarea
                  id="comment"
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  placeholder="Share your experience..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full">
                Submit Review
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
