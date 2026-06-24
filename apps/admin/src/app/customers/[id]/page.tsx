'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency, formatDate } from '@ecokuku/ui';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  CalendarDays,
  Mail,
  Phone,
  User,
  Star,
  Package,
  StickyNote,
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
  };
}

interface BatchOrder {
  id: string;
  orderNumber: string;
  quantity: number;
  pricePerChick: number;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  status: string;
  createdAt: string;
  batch: {
    id: string;
    batchNumber: string;
    type: string;
  };
}

interface MostOrderedProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
}

interface CustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  orders: Order[];
  reviews: Review[];
  batchOrders: BatchOrder[];
  stats: {
    totalSpent: number;
    orderCount: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
  };
  mostOrderedProducts: MostOrderedProduct[];
  tier: 'Gold' | 'Silver' | 'Regular';
}

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-cyan-100 text-cyan-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  PACKED: 'bg-indigo-100 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-red-100 text-red-700',
  FAILED: 'bg-red-100 text-red-700',
};

const TIER_COLORS: Record<string, string> = {
  Gold: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  Silver: 'bg-gray-100 text-gray-700 border border-gray-300',
  Regular: 'bg-green-100 text-green-700 border border-green-300',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user && customerId) {
      fetchCustomer();
    }
  }, [session, customerId]);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Customer not found');
          router.push('/customers');
          return;
        }
        throw new Error('Failed to fetch customer');
      }
      const data = await response.json();
      setCustomer(data.data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to load customer details');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded-lg mt-6"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
          <div className="p-8 text-center text-gray-600">Customer not found.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex items-center gap-4">
            <Link
              href="/customers"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{customer.name}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${TIER_COLORS[customer.tier]}`}
                >
                  {customer.tier}
                </span>
              </div>
              <p className="text-gray-600 mt-1">Customer details and order history</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={28} className="text-green-700" />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                  <p className="font-semibold text-gray-900">{customer.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                  <div className="flex items-center gap-1.5">
                    <Mail size={14} className="text-gray-400" />
                    <p className="text-sm text-gray-700">{customer.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                  <div className="flex items-center gap-1.5">
                    <Phone size={14} className="text-gray-400" />
                    <p className="text-sm text-gray-700">{customer.phone || '---'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Member Since</p>
                  <p className="text-sm text-gray-700">
                    {formatDate(new Date(customer.createdAt))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ShoppingCart size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customer.stats.orderCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(customer.stats.totalSpent)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(customer.stats.avgOrderValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <CalendarDays size={20} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Last Order</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customer.stats.lastOrderDate
                      ? formatDate(new Date(customer.stats.lastOrderDate))
                      : '---'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase History Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package size={20} className="text-gray-500" />
                Purchase History
              </h2>
            </div>
            {customer.orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No orders yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      {['Order Number', 'Date', 'Items', 'Total (KSh)', 'Status'].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customer.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(new Date(order.createdAt))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                          {order.items.length}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-900">
                          {formatCurrency(Number(order.total))}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Most Ordered Products + Batch Orders Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Ordered Products */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Star size={20} className="text-yellow-500" />
                  Most Ordered Products
                </h2>
              </div>
              {customer.mostOrderedProducts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No product data yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Product
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Qty Ordered
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customer.mostOrderedProducts.map((product, idx) => (
                        <tr key={product.productId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {product.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            {product.totalQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Batch Orders */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package size={20} className="text-green-600" />
                  Batch Orders
                </h2>
              </div>
              {customer.batchOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No batch orders yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        {['Order #', 'Batch', 'Qty', 'Total', 'Status'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customer.batchOrders.map((bo) => (
                        <tr key={bo.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">
                            {bo.orderNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {bo.batch.batchNumber} ({bo.batch.type})
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{bo.quantity}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-900">
                            {formatCurrency(Number(bo.totalPrice))}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                STATUS_COLORS[bo.status] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {bo.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Reviews */}
          {customer.reviews.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Star size={20} className="text-orange-500" />
                  Reviews ({customer.reviews.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {customer.reviews.map((review) => (
                  <div key={review.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-gray-900">
                        {review.product.name}
                      </p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={
                              i < review.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(new Date(review.createdAt))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <StickyNote size={20} className="text-gray-500" />
                Admin Notes
              </h2>
            </div>
            <div className="p-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this customer... (save functionality coming soon)"
                className="w-full h-32 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              />
              <p className="text-xs text-gray-400 mt-2">
                Notes are not saved yet. Backend support coming soon.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
