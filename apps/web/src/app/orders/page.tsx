'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@ecokuku/ui';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

export default function OrdersPage() {
  const [orders] = useState([
    {
      id: 'ORD-001',
      date: '2024-01-15',
      total: 2600,
      status: 'DELIVERED',
      items: [
        { name: 'Free Range Eggs (30 pieces)', quantity: 2, price: 1200 },
      ],
      trackingUrl: '#',
      estimatedDelivery: '2024-01-16',
    },
    {
      id: 'ORD-002',
      date: '2024-01-18',
      total: 3800,
      status: 'SHIPPED',
      items: [
        { name: 'Live Broiler Chicken', quantity: 1, price: 3500 },
      ],
      trackingUrl: '#',
      estimatedDelivery: '2024-01-19',
    },
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock size={20} className="text-yellow-500" />;
      case 'SHIPPED':
        return <Truck size={20} className="text-blue-500" />;
      case 'DELIVERED':
        return <CheckCircle size={20} className="text-green-500" />;
      default:
        return <Package size={20} className="text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (orders.length === 0) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Order Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(order.status)}
                  <div>
                    <p className="font-semibold text-gray-900">Order #{order.id}</p>
                    <p className="text-sm text-gray-600">{new Date(order.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-gray-900">KSh {order.total.toLocaleString()}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="font-medium text-gray-900">
                        KSh {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Timeline */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Status Timeline</h3>
                <div className="space-y-3">
                  {order.status === 'DELIVERED' && (
                    <div className="flex gap-4">
                      <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Delivered</p>
                        <p className="text-sm text-gray-600">
                          {new Date(order.estimatedDelivery).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                  {order.status === 'SHIPPED' && (
                    <>
                      <div className="flex gap-4">
                        <Truck size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900">Shipped</p>
                          <p className="text-sm text-gray-600">In transit to you</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 ml-9">
                        Estimated delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                      </p>
                    </>
                  )}
                  {order.status === 'PENDING' && (
                    <div className="flex gap-4">
                      <Clock size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Processing</p>
                        <p className="text-sm text-gray-600">We're preparing your order</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Actions */}
              <div className="px-6 py-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  View Details
                </Button>
                {order.status === 'SHIPPED' && (
                  <Button className="flex-1 bg-green-600 text-white hover:bg-green-700">
                    Track Package
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Continue Shopping */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">Want to order more?</p>
          <Link href="/shop">
            <Button className="bg-green-600 text-white hover:bg-green-700">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
