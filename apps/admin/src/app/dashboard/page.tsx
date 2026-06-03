'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MetricCard, StatusPill, formatCurrency } from '@ecokuku/ui';
import Link from 'next/link';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface DashboardData {
  metrics: {
    totalBirds: number;
    activeBatchCount: number;
    eggsToday: number;
    eggsTrend: number | null;
    ordersToday: number;
    ordersTrend: number | null;
    revenueToday: number;
    revenueTrend: number | null;
    mortalityThisMonth: number;
    pendingBatchOrders: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
    customer: { name: string; email: string };
    items: { product: { name: string } }[];
  }[];
  lowStockProducts: { id: string; name: string; stock: number; category: string }[];
  activeBatches: { id: string; batchNumber: string; type: string; currentCount: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const m = data?.metrics;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">Farm overview and performance metrics</p>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  label="Total Chickens"
                  value={m?.totalBirds.toLocaleString() || '—'}
                  trend={undefined}
                  trendValue={m ? `${m.activeBatchCount} batches` : ''}
                  trendLabel="active"
                  icon={<div className="text-4xl">🐔</div>}
                />
                <MetricCard
                  label="Eggs Collected Today"
                  value={m?.eggsToday.toLocaleString() || '0'}
                  trend={m?.eggsTrend != null ? (m.eggsTrend >= 0 ? 'up' : 'down') : undefined}
                  trendValue={m?.eggsTrend != null ? `${m.eggsTrend > 0 ? '+' : ''}${m.eggsTrend}%` : ''}
                  trendLabel="vs yesterday"
                  icon={<div className="text-4xl">🥚</div>}
                />
                <MetricCard
                  label="Orders Today"
                  value={String(m?.ordersToday || 0)}
                  trend={m?.ordersTrend != null ? (m.ordersTrend >= 0 ? 'up' : 'down') : undefined}
                  trendValue={m?.ordersTrend != null ? `${m.ordersTrend > 0 ? '+' : ''}${m.ordersTrend}` : ''}
                  trendLabel="vs yesterday"
                  icon={<div className="text-4xl">📦</div>}
                />
                <MetricCard
                  label="Revenue Today"
                  value={m ? `KSh ${m.revenueToday.toLocaleString()}` : '—'}
                  trend={m?.revenueTrend != null ? (m.revenueTrend >= 0 ? 'up' : 'down') : undefined}
                  trendValue={m?.revenueTrend != null ? `${m.revenueTrend > 0 ? '+' : ''}${m.revenueTrend}%` : ''}
                  trendLabel="vs yesterday"
                  icon={<TrendingUp className="w-8 h-8 text-green-600" />}
                />
              </div>

              {/* Alert banners */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {(m?.pendingBatchOrders || 0) > 0 && (
                  <Link href="/batch-bookings?status=PENDING_PAYMENT" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors">
                    <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-semibold text-amber-900">{m?.pendingBatchOrders} batch bookings awaiting payment</p>
                      <p className="text-sm text-amber-700">Review and confirm pending batch orders</p>
                    </div>
                  </Link>
                )}
                {(data?.lowStockProducts.length || 0) > 0 && (
                  <Link href="/inventory" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors">
                    <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-semibold text-red-900">{data?.lowStockProducts.length} products low on stock</p>
                      <p className="text-sm text-red-700">{data?.lowStockProducts.map((p) => p.name).join(', ')}</p>
                    </div>
                  </Link>
                )}
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-lg border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-bold text-lg">Recent Orders</h3>
                  <Link href="/orders" className="text-sm text-green-700 font-medium hover:text-green-900">View all →</Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Order #', 'Customer', 'Item', 'Amount', 'Status', 'Date'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(data?.recentOrders || []).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm font-medium">{order.orderNumber}</td>
                          <td className="px-4 py-3 text-sm">{order.customer.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {order.items[0]?.product?.name || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-800">
                            {formatCurrency(Number(order.total))}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={order.status.replace(/_/g, ' ')} />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                          </td>
                        </tr>
                      ))}
                      {(data?.recentOrders || []).length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">No orders yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Batches */}
              {(data?.activeBatches.length || 0) > 0 && (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-bold text-lg">Active Batches</h3>
                    <Link href="/batches" className="text-sm text-green-700 font-medium hover:text-green-900">Manage →</Link>
                  </div>
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data?.activeBatches.map((b) => (
                      <Link key={b.id} href={`/batches/${b.id}`} className="bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 transition-colors">
                        <p className="font-mono text-xs text-green-700">{b.batchNumber}</p>
                        <p className="font-bold text-gray-900 mt-1">{b.currentCount.toLocaleString()} birds</p>
                        <p className="text-xs text-gray-500 mt-0.5">{b.type}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
