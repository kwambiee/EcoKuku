'use client';

import { Sidebar } from '@/components/Sidebar';
import { Card, Badge } from '@ecokuku/ui';
import { BarChart3, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const metrics = [
    { label: 'Total Revenue', value: 'KSh 125,450', trend: '+15%' },
    { label: 'Total Orders', value: '234', trend: '+8%' },
    { label: 'Avg Order Value', value: 'KSh 5,360', trend: '-2%' },
    { label: 'Customer Count', value: '89', trend: '+12%' },
  ];

  const monthlyData = [
    { month: 'January', revenue: 'KSh 85,230', orders: 156, avg: 'KSh 5,463' },
    { month: 'February', revenue: 'KSh 92,450', orders: 172, avg: 'KSh 5,37' },
    { month: 'March', revenue: 'KSh 125,450', orders: 234, avg: 'KSh 5,360' },
  ];

  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex items-center gap-3">
            <BarChart3 size={32} className="text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">Farm performance and sales analytics</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {metrics.map((metric) => (
              <Card key={metric.label} className="p-4">
                <p className="text-gray-600 text-sm">{metric.label}</p>
                <div className="flex justify-between items-end mt-2">
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <span className="text-green-600 text-sm flex items-center gap-1">
                    <TrendingUp size={14} /> {metric.trend}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Monthly Report */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h2 className="font-bold text-lg">Monthly Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Month</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Revenue</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Orders</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Avg Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthlyData.map((row) => (
                    <tr key={row.month} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold">{row.month}</td>
                      <td className="px-6 py-4">{row.revenue}</td>
                      <td className="px-6 py-4">{row.orders}</td>
                      <td className="px-6 py-4">{row.avg}</td>
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
