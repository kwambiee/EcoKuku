'use client';

import { Sidebar } from '@/components/Sidebar';
import { MetricCard, StatusPill } from '@ecokuku/ui';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">Farm overview and performance metrics</p>
        </div>

        <div className="p-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              label="Total Chickens"
              value="7,800"
              trend="up"
              trendValue="+120"
              trendLabel="from last week"
              icon={<div className="text-4xl">🐔</div>}
            />
            <MetricCard
              label="Eggs Collected Today"
              value="3,850"
              trend="up"
              trendValue="+240"
              trendLabel="vs yesterday"
              icon={<div className="text-4xl">🥚</div>}
            />
            <MetricCard
              label="Mortality Rate"
              value="0.8%"
              trend="down"
              trendValue="-0.2%"
              trendLabel="vs last month"
              icon={<div className="text-4xl">📊</div>}
            />
            <MetricCard
              label="Orders Today"
              value="23"
              trend="up"
              trendValue="+5"
              trendLabel="vs yesterday"
              icon={<div className="text-4xl">📦</div>}
            />
          </div>

          {/* Revenue & Feed Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-4">Revenue</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-sm text-gray-600">Daily Revenue</div>
                    <div className="text-3xl font-bold">KSh 45,230</div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <div className="text-sm text-gray-600">Monthly: KSh 1,234,300 | YTD: KSh 2,456,700</div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-lg mb-4">Feed Consumption</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-sm text-gray-600">Today</div>
                    <div className="text-3xl font-bold">580 kg</div>
                  </div>
                  <div className="text-4xl">🌽</div>
                </div>
                <div className="text-sm text-gray-600">Stock: 2,340 kg | Cost: KSh 75,400</div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-lg">Recent Orders</h3>
            </div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr className="bg-gray-50">
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'ECO-2024-001', customer: 'Joy Kwamboka', product: 'Eggs Tray x2', amount: 1300, status: 'delivered' },
                    { id: 'ECO-2024-002', customer: 'Sarah Kipchoge', product: 'Live Chicken x1', amount: 850, status: 'out_for_delivery' },
                    { id: 'ECO-2024-003', customer: 'John Kariuki', product: 'Chicks x100', amount: 1500, status: 'processing' },
                    { id: 'ECO-2024-004', customer: 'Mary Wanjiru', product: 'Eggs Crate x1', amount: 6800, status: 'paid' },
                    { id: 'ECO-2024-005', customer: 'David Kipchoge', product: 'Mixed Order', amount: 2450, status: 'pending' },
                  ].map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="font-medium">{order.id}</td>
                      <td>{order.customer}</td>
                      <td>{order.product}</td>
                      <td className="font-medium">KSh {order.amount.toLocaleString()}</td>
                      <td>
                        <StatusPill status={order.status.replace('_', ' ')} />
                      </td>
                      <td className="text-gray-600">Today</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
