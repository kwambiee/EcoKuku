'use client';

import { Sidebar } from '@/components/Sidebar';
import { Button, Card, Badge } from '@ecokuku/ui';
import { AlertTriangle } from 'lucide-react';

export default function InventoryPage() {
  const inventory = [
    { product: 'Eggs (30 pcs)', stock: '450', reorder: '200', status: 'OK' },
    { product: 'Chicken (live)', stock: '1200', reorder: '500', status: 'OK' },
    { product: 'Chicken (frozen)', stock: '80', reorder: '200', status: 'LOW' },
    { product: 'Layer Mash', stock: '2340', reorder: '1000', status: 'OK' },
  ];

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Track product stock levels</p>
          </div>
        </div>

        <div className="p-6">
          {/* Low Stock Alert */}
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertTriangle size={20} className="flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold">Low Stock Alert</p>
              <p className="text-sm mt-1">Frozen Chicken stock is below reorder level. Consider restocking soon.</p>
            </div>
          </div>

          {/* Inventory Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Product</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Current Stock</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Reorder Level</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventory.map((item) => (
                    <tr key={item.product} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold">{item.product}</td>
                      <td className="px-6 py-4">{item.stock}</td>
                      <td className="px-6 py-4">{item.reorder}</td>
                      <td className="px-6 py-4">
                        <Badge className={item.status === 'LOW' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {item.status}
                        </Badge>
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
