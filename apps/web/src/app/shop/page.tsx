'use client';

import { useEffect, useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { SlidersHorizontal, X } from 'lucide-react';
import { resolveImageUrl } from '@/lib/imageUrl';

interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  price: number;
  wholesalePrice?: number;
  stock: number;
  available: boolean;
  image?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  EGGS: 'Eggs',
  LIVE_POULTRY: 'Live Poultry',
  DRESSED_MEAT: 'Dressed Meat',
  CHICKS: 'Chicks',
};

const CATEGORY_EMOJIS: Record<string, string> = {
  EGGS: '🥚',
  LIVE_POULTRY: '🐔',
  DRESSED_MEAT: '🍗',
  CHICKS: '🐣',
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const { addItem } = useCart();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '24' });
      if (selectedCategories.length === 1) {
        params.set('category', selectedCategories[0]);
      }
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      let results: Product[] = data.data || [];
      if (selectedCategories.length > 1) {
        results = results.filter((p) => selectedCategories.includes(p.category));
      }
      setProducts(results);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      category: product.category,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const FilterPanel = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-bold text-lg mb-4">Filters</h3>
      <div className="mb-6">
        <h4 className="font-bold text-sm mb-3 text-gray-700">Category</h4>
        <div className="space-y-2">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategories.includes(key)}
                onChange={() => toggleCategory(key)}
                className="w-4 h-4 accent-green-700"
              />
              <span className="text-sm group-hover:text-green-800 transition-colors">
                {CATEGORY_EMOJIS[key]} {label}
              </span>
            </label>
          ))}
        </div>
      </div>
      {selectedCategories.length > 0 && (
        <button
          onClick={() => setSelectedCategories([])}
          className="w-full text-sm text-red-600 hover:text-red-800 font-medium flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" /> Clear filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-200">
          <div className="container-base py-6 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">Shop</h1>
              <p className="text-gray-600">Browse our fresh poultry products</p>
            </div>
            {/* Mobile filter toggle */}
            <button
              className="md:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters {selectedCategories.length > 0 && `(${selectedCategories.length})`}
            </button>
          </div>
        </div>

        {/* Mobile filter drawer */}
        {showFilters && (
          <div className="md:hidden container-base py-4">
            <FilterPanel />
          </div>
        )}

        <div className="container-base py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar — desktop only */}
            <div className="hidden md:block md:col-span-1">
              <FilterPanel />
            </div>

            {/* Products Grid */}
            <div className="md:col-span-3">
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedCategories.map((cat) => (
                    <span
                      key={cat}
                      className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                    >
                      {CATEGORY_LABELS[cat]}
                      <button onClick={() => toggleCategory(cat)} className="hover:text-green-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                      <div className="bg-gray-100 h-40" />
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-8 bg-gray-200 rounded mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                  <div className="text-5xl mb-4">🛒</div>
                  <p className="text-gray-600 mb-2 font-medium">No products found</p>
                  <p className="text-gray-500 text-sm">Try adjusting your filters or check back soon</p>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="mt-4 text-green-700 font-medium underline text-sm"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Link key={product.id} href={`/shop/${product.id}`} className="group">
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-green-400 hover:shadow-md transition-all duration-200">
                        <div className="bg-green-50 h-40 flex items-center justify-center text-6xl relative group-hover:bg-green-100 transition-colors overflow-hidden">
                          {resolveImageUrl(product.image) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveImageUrl(product.image)!} alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          ) : (
                            <span className="group-hover:scale-110 transition-transform duration-200 inline-block">
                              {CATEGORY_EMOJIS[product.category] || '🐔'}
                            </span>
                          )}
                          {!product.available || product.stock === 0 ? (
                            <span className="absolute top-2 right-2 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                              Out of Stock
                            </span>
                          ) : product.wholesalePrice ? (
                            <span className="absolute top-2 left-2 bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">
                              Wholesale
                            </span>
                          ) : null}
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            {CATEGORY_LABELS[product.category] || product.category}
                          </p>
                          <h3 className="font-bold text-sm mb-1 group-hover:text-green-700 transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                          <p className="text-green-700 font-bold text-lg mb-3">
                            KSh {Number(product.price).toLocaleString()}
                          </p>
                          <button
                            onClick={(e) => handleAddToCart(e, product)}
                            disabled={!product.available || product.stock === 0}
                            className={`w-full font-medium py-2 rounded-md transition-colors text-sm ${
                              addedId === product.id
                                ? 'bg-green-600 text-white'
                                : product.available && product.stock > 0
                                ? 'bg-green-800 text-white hover:bg-green-700'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {addedId === product.id ? '✓ Added!' : product.available && product.stock > 0 ? 'Add to cart' : 'Out of stock'}
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
