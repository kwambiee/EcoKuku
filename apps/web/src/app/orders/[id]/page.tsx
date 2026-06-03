'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@ecokuku/ui';
import { AlertCircle, Loader, Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  createdAt: string;
  updatedAt: string;
  delivery?: {
    address: string;
    estimatedDate: string;
    driver?: string;
  };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product?: {
      name: string;
    };
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PAID':
      return 'bg-blue-100 text-blue-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'PACKED':
      return 'bg-purple-100 text-purple-800';
    case 'OUT_FOR_DELIVERY':
      return 'bg-orange-100 text-orange-800';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PENDING':
    case 'PROCESSING':
      return <Clock size={24} className="text-yellow-500" />;
    case 'PAID':
      return <CheckCircle size={24} className="text-blue-500" />;
    case 'PACKED':
      return <Package size={24} className="text-purple-500" />;
    case 'OUT_FOR_DELIVERY':
      return <Truck size={24} className="text-orange-500" />;
    case 'DELIVERED':
      return <CheckCircle size={24} className="text-green-500" />;
    default:
      return <Package size={24} className="text-gray-500" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Waiting for confirmation';
    case 'PAID':
      return 'Payment confirmed';
    case 'PROCESSING':
      return 'Processing order';
    case 'PACKED':
      return 'Packed and ready';
    case 'OUT_FOR_DELIVERY':
      return 'Out for delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Order cancelled';
    default:
      return status;
  }
};

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/orders/${params.id}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 404) {
            setError('Order not found');
          } else if (res.status === 401) {
            router.push('/auth/login');
          } else {
            throw new Error('Failed to fetch order');
          }
          return;
        }

        const data = await res.json();
        setOrder(data.data || data);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params.id, router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader className="animate-spin" size={40} />
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white">
          <div className="container mx-auto px-4 py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-4 mb-6">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                <p className="text-red-800">{error || 'Order not found'}</p>
              </div>
            </div>
            <Link href="/orders" className="inline-block text-green-700 hover:text-green-900 font-medium">
              ← Back to My Orders
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const subtotal = Number(order.subtotal) || order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const delivery = Number(order.deliveryFee) || 200;
  const discount = Number(order.discountAmount) || 0;
  const total = Number(order.total) || subtotal + delivery - discount;
  const createdDate = new Date(order.createdAt);
  const updatedDate = new Date(order.updatedAt);

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/account" className="text-blue-600 hover:text-blue-900 mb-4 inline-block">
            ← Back to My Account
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order #{order.orderNumber}</h1>
          <p className="text-gray-600">Placed on {createdDate.toLocaleDateString()}</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              {getStatusIcon(order.status)}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{getStatusLabel(order.status)}</h2>
                <p className="text-sm text-gray-600 mt-1">Last updated {updatedDate.toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t pt-6">
            <div className="space-y-4">
              {[
                { status: 'PENDING', label: 'Order placed' },
                { status: 'PROCESSING', label: 'Processing' },
                { status: 'PACKED', label: 'Packed' },
                { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
                { status: 'DELIVERED', label: 'Delivered' },
              ].map((step) => {
                const defaultStatuses = ['PENDING', 'PAID', 'PROCESSING', 'PACKED'];
                const isCompleted = defaultStatuses.includes(order.status) || order.status === 'DELIVERED' || order.status === 'OUT_FOR_DELIVERY';
                const isActive = step.status === order.status || (order.status === 'OUT_FOR_DELIVERY' && defaultStatuses.includes(step.status));

                return (
                  <div key={step.status} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isActive || isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {isActive || isCompleted ? (
                        <CheckCircle size={20} className="text-white" />
                      ) : (
                        <div className="w-2 h-2 bg-gray-600 rounded-full" />
                      )}
                    </div>
                    <span className={isActive || isCompleted ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        {order.delivery && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-4">
              <MapPin size={24} className="text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Delivery Information</h3>
                <p className="text-gray-700 mb-2">{order.delivery.address}</p>
                <p className="text-sm text-gray-600">
                  Estimated delivery: {new Date(order.delivery.estimatedDate).toLocaleDateString()}
                </p>
                {order.delivery.driver && (
                  <p className="text-sm text-gray-600 mt-2">Driver: {order.delivery.driver}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Order Items</h3>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between pb-4 border-b last:border-b-0">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {item.product?.name || `Product ${item.productId}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Quantity: {item.quantity}</p>
                </div>
                <p className="font-semibold text-gray-900">
                  KSh {(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>KSh {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery</span>
              <span>KSh {delivery.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Discount</span>
                <span>−KSh {discount.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-green-600">KSh {total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <Link href="/orders" className="flex-1">
            <Button variant="secondary" className="w-full">
              My Orders
            </Button>
          </Link>
          <Link href="/shop" className="flex-1">
            <Button className="w-full bg-green-600 text-white hover:bg-green-700">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
