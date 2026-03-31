'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card, Badge } from '@ecokuku/ui';
import { Plus } from 'lucide-react';

export default function CustomersPage() {
  const customers = [
    { id: 'CUST-001', name: 'John Kamau', email: 'john@email.com', phone: '0712345678', orders: 5, lastOrder: '2024-01-20' },
    { id: 'CUST-002', name: 'Alice Mwangi', email: 'alice@email.com', phone: '0723456789', orders: 12, lastOrder: '2024-01-19' },
    { id: 'CUST-003', name: 'Bob Kipchoge', email: 'bob@email.com', phone: '0734567890', orders: 3, lastOrder: '2024-01-18' },
  ];

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-gray-600 mt-1">Manage customer accounts and orders</p>
          </div>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="bg-white p-4 rounded-lg mb-6">
            <input type="text" placeholder="Search customers..." className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>

          {/* Customers Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Orders</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Last Order</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold">{cust.name}</td>
                      <td className="px-6 py-4 text-sm">{cust.email}</td>
                      <td className="px-6 py-4 text-sm">{cust.phone}</td>
                      <td className="px-6 py-4 text-sm">{cust.orders}</td>
                      <td className="px-6 py-4 text-sm">{cust.lastOrder}</td>
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
