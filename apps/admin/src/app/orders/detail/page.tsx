'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card, Badge } from '@ecokuku/ui';
import { Plus } from 'lucide-react';

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const orders = [
    { id: 'ORD-001', customer: 'John Kamau', total: 'KSh 5,200', status: 'PENDING', date: '2024-01-20' },
    { id: 'ORD-002', customer: 'Alice Mwangi', total: 'KSh 8,500', status: 'SHIPPED', date: '2024-01-19' },
    { id: 'ORD-003', customer: 'Bob Kipchoge', total: 'KSh 3,200', status: 'DELIVERED', date: '2024-01-18' },
  ];

  const getStatusColor = (status: string) => {
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

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Orders Management</h1>
              <p className="text-gray-600 mt-1">Manage customer orders and fulfillment</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg mb-6 flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Orders</option>
              <option value="PENDING">Pending</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>

          {/* Orders Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Order ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Total</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders
                    .filter((o) => !statusFilter || o.status === statusFilter)
                    .map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold">{order.id}</td>
                        <td className="px-6 py-4">{order.customer}</td>
                        <td className="px-6 py-4 text-sm">{order.date}</td>
                        <td className="px-6 py-4 font-semibold">{order.total}</td>
                        <td className="px-6 py-4">
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Button className="bg-blue-600 text-white text-sm py-1 px-3">View</Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
