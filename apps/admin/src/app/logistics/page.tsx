'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Button, Card, Badge } from '@ecokuku/ui';
import { Truck, MapPin } from 'lucide-react';

export default function LogisticsPage() {
  const deliveries = [
    { id: 'DEL-001', customer: 'John Kamau', location: 'Nairobi', status: 'IN_TRANSIT', driver: 'James', phone: '0712345678' },
    { id: 'DEL-002', customer: 'Alice Mwangi', location: 'Kiambu', status: 'PENDING', driver: 'Peter', phone: '0723456789' },
    { id: 'DEL-003', customer: 'Bob Kipchoge', location: 'Nakuru', status: 'DELIVERED', driver: 'David', phone: '0734567890' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_TRANSIT':
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
          <div>
            <h1 className="text-3xl font-bold">Logistics & Delivery</h1>
            <p className="text-gray-600 mt-1">Manage delivery routes and assignments</p>
          </div>
        </div>

        <div className="p-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Today's Deliveries</p>
              <p className="text-2xl font-bold mt-2">12</p>
            </Card>
            <Card className="p-4">
              <p className="text-gray-600 text-sm">In Transit</p>
              <p className="text-2xl font-bold mt-2">5</p>
            </Card>
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-2xl font-bold mt-2">7</p>
            </Card>
          </div>

          {/* Deliveries Table */}
          <Card>
            <div className="p-6 border-b border-gray-200 flex items-center gap-2">
              <Truck size={20} />
              <h2 className="font-bold text-lg">Active Deliveries</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Customer</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Location</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Driver</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold">{del.id}</td>
                      <td className="px-6 py-4">{del.customer}</td>
                      <td className="px-6 py-4 flex items-center gap-1">
                        <MapPin size={14} /> {del.location}
                      </td>
                      <td className="px-6 py-4 text-sm">{del.driver}</td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(del.status)}>{del.status}</Badge>
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
