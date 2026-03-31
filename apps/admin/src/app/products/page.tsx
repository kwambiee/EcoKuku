'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button, Badge, formatCurrency } from '@ecokuku/ui';
import { Plus, Edit2, Eye } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  category: string;
  stockQuantity: number;
  isAvailable: boolean;
}

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    type: 'EGGS',
    category: '',
    stockQuantity: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchProducts();
    }
  }, [session]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stockQuantity: parseInt(formData.stockQuantity),
        }),
      });

      if (response.ok) {
        setFormData({
          name: '',
          description: '',
          price: '',
          type: 'EGGS',
          category: '',
          stockQuantity: '',
        });
        setShowForm(false);
        fetchProducts();
      }
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="p-8">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <Plus size={20} />
          Add Product
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Product</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="EGGS">Eggs</option>
                  <option value="LIVE_BIRD">Live Bird</option>
                  <option value="MEAT">Meat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create Product</Button>
              <Button
                type="button"
                className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Products Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            No products yet. Create your first product to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-900 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-gray-100 text-gray-800">{product.type}</Badge>
                      <Badge className="bg-gray-100 text-gray-800">{product.category}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(product.price)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {product.stockQuantity} in stock
                    </p>
                    {!product.isAvailable && (
                      <Badge className="bg-red-100 text-red-800 mt-2">Out of Stock</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="text-green-900 hover:text-green-800 p-1">
                    <Eye size={18} />
                  </button>
                  <button className="text-blue-900 hover:text-blue-800 p-1">
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
