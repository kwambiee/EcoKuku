'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@ecokuku/ui';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Package, Truck, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: { name: string };
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  deliveryArea?: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:          { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={16} /> },
  PAID:             { label: 'Paid',            color: 'bg-cyan-100 text-cyan-800',     icon: <CheckCircle size={16} /> },
  PROCESSING:       { label: 'Processing',      color: 'bg-blue-100 text-blue-800',     icon: <Package size={16} /> },
  PACKED:           { label: 'Packed',          color: 'bg-indigo-100 text-indigo-800', icon: <Package size={16} /> },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',color: 'bg-purple-100 text-purple-800', icon: <Truck size={16} /> },
  DELIVERED:        { label: 'Delivered',       color: 'bg-green-100 text-green-800',   icon: <CheckCircle size={16} /> },
  CANCELLED:        { label: 'Cancelled',       color: 'bg-red-100 text-red-800',       icon: <XCircle size={16} /> },
  FAILED:           { label: 'Failed',          color: 'bg-red-100 text-red-800',       icon: <XCircle size={16} /> },
};

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/orders');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/orders')
        .then((r) => r.json())
        .then((data) => setOrders(data.data || []))
        .catch(() => setOrders([]))
        .finally(() => setIsLoading(false));
    }
  }, [session]);

  if (status === 'loading' || isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 mb-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!session) return null;

  if (orders.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white py-16 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-6">📦</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">No Orders Yet</h1>
            <p className="text-gray-600 mb-8">Start shopping to place your first order!</p>
            <Link href="/shop">
              <Button className="bg-green-600 text-white hover:bg-green-700">Browse Products</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
            <p className="text-gray-600">Track and manage your orders</p>
          </div>

          <div className="space-y-4">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
              return (
                <div key={order.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-green-300 transition-colors">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-500">{cfg.icon}</div>
                      <div>
                        <p className="font-bold text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {order.deliveryArea && ` · ${order.deliveryArea}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">KSh {Number(order.total).toLocaleString()}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} —{' '}
                      {order.items.slice(0, 2).map((i) => i.product.name).join(', ')}
                      {order.items.length > 2 && ` +${order.items.length - 2} more`}
                    </p>
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-1 text-sm text-green-700 font-medium hover:text-green-900"
                    >
                      View <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link href="/shop">
              <Button className="bg-green-600 text-white hover:bg-green-700">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
