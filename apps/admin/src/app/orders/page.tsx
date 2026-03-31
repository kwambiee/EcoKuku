'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Badge, formatCurrency } from '@ecokuku/ui';
import { formatDate } from '@ecokuku/ui';
import { Eye, Edit2 } from 'lucide-react';

interface Order {
  id: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  totalPrice: number;
  status: string;
  createdAt: string;
  deliveryDate: string;
  deliveryCity: string;
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchOrders();
    }
  }, [session, statusFilter]);

  const fetchOrders = async () => {
    try {
      const url = new URL('/api/orders', window.location.origin);
      if (statusFilter) {
        url.searchParams.set('status', statusFilter);
      }

      const response = await fetch(url);
      const data = await response.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'PENDING_PAYMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'IN_TRANSIT':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Order Management</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            statusFilter === ''
              ? 'bg-green-900 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        {['PENDING_PAYMENT', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFilter === status
                  ? 'bg-green-900 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ),
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Delivery City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {order.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{order.user.name}</p>
                        <p className="text-sm text-gray-600">{order.user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-900">
                      {formatCurrency(order.totalPrice)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{order.deliveryCity}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(new Date(order.createdAt))}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-green-900 hover:text-green-800 p-1">
                          <Eye size={18} />
                        </button>
                        <button className="text-blue-900 hover:text-blue-800 p-1">
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
