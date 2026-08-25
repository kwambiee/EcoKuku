'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency } from '@ecokuku/ui';
import Link from 'next/link';
import {
  DollarSign, ShoppingCart, Egg, Bird, Wheat, CreditCard,
  Bell, CheckCircle, Circle, AlertTriangle, Clock,
  ArrowRight, TrendingUp, TrendingDown, Package, BarChart3, Target, Calculator,
} from 'lucide-react';

interface DashboardData {
  greeting: { name: string; date: string };
  metrics: {
    revenueToday: number; revenueTrend: number | null;
    ordersToday: number; ordersPending: number; ordersOutForDelivery: number;
    eggsToday: number; eggsDiff: number | null;
    totalBirds: number; activeBatchCount: number; mortalityToday: number;
    feedStock: number; feedLowestDays: number | null; feedIsLow: boolean;
    outstandingPayments: number; outstandingCount: number;
  };
  alerts: { type: 'red' | 'amber' | 'blue'; title: string; detail: string; link?: string }[];
  tasks: { label: string; detail?: string; done: boolean; link?: string }[];
  recentOrders: { id: string; orderNumber: string; status: string; total: number; customerName: string; itemSummary: string; deliveryArea: string }[];
  eggsThisWeek: { days: { day: string; collected: number; good: number; isToday: boolean }[]; weekTotal: number; dailyAvg: number; qualityRate: string };
  batchesByType: Record<string, { id: string; batchNumber: string; type: string; currentCount: number; ageWeeks: number; breed?: string; alerts: string[] }[]>;
  monthSummary: { revenue: number; expenses: number; netProfit: number; trend: number | null };
  inventorySnapshot: { name: string; value: string; warning?: boolean }[];
  preOrders: { count: number; nextFulfilment: string | null; items: { description: string }[] };
  lowStockProducts: { id: string; name: string; stock: number; category: string }[];
  weeklyGoals: {
    id: string; category: string; label: string | null; target: number; actual: number;
    progressPct: number; isLowerBetter: boolean; currentPace: number; neededPace: number; daysRemaining: number;
  }[];
  costOfProduction: {
    costPerEgg: number | null;
    costPerBirdMonth: number | null;
    eggsThisMonth: number;
    expensesThisMonth: number;
    totalActiveBirds: number;
    batchCostBreakdown: { batchNumber: string; costPerChick: number | null; totalAcquisitionCost: number; initialCount: number; currentCount: number }[];
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-cyan-100 text-cyan-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  PACKED: 'bg-indigo-100 text-indigo-800',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
};

const ALERT_COLORS = {
  red: { dot: 'bg-red-500', bg: '' },
  amber: { dot: 'bg-amber-500', bg: '' },
  blue: { dot: 'bg-blue-500', bg: '' },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const m = data?.metrics;
  const alertCount = data?.alerts.filter((a) => a.type === 'red' || a.type === 'amber').length || 0;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-stone-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {data ? `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${data.greeting.name}` : 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {data?.greeting.date || ''} &middot; Kwamboka Poultry Farm
            </p>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
              <Bell size={15} /> {alertCount} alert{alertCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                  <div className="h-7 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ) : data && m ? (
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">

            {/* TODAY AT A GLANCE */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Today at a Glance</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Revenue Today */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <DollarSign size={13} /> Revenue today
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(m.revenueToday)}</p>
                  {m.revenueTrend !== null && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${m.revenueTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {m.revenueTrend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {m.revenueTrend > 0 ? '+' : ''}{m.revenueTrend}% vs yesterday
                    </p>
                  )}
                </div>

                {/* Orders Today */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <ShoppingCart size={13} /> Orders today
                  </div>
                  <p className="text-xl font-bold text-gray-900">{m.ordersToday}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {m.ordersPending} pending &middot; {m.ordersOutForDelivery} out for delivery
                  </p>
                </div>

                {/* Eggs Collected */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Egg size={13} /> Eggs collected
                  </div>
                  <p className="text-xl font-bold text-gray-900">{m.eggsToday.toLocaleString()}</p>
                  {m.eggsDiff !== null && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${m.eggsDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {m.eggsDiff >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {m.eggsDiff > 0 ? '+' : ''}{m.eggsDiff} vs yesterday
                    </p>
                  )}
                </div>

                {/* Live Bird Count */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Bird size={13} /> Live bird count
                  </div>
                  <p className="text-xl font-bold text-gray-900">{m.totalBirds.toLocaleString()}</p>
                  {m.mortalityToday > 0 && (
                    <p className="text-xs text-red-500 mt-1">{m.mortalityToday} mortality logged today</p>
                  )}
                  {m.mortalityToday === 0 && (
                    <p className="text-xs text-gray-400 mt-1">{m.activeBatchCount} active batches</p>
                  )}
                </div>
              </div>

              {/* Second row: Feed Stock + Outstanding Payments */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Link href="/feed" className={`bg-white rounded-xl border p-4 hover:bg-gray-50 transition ${m.feedIsLow ? 'border-amber-300' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Wheat size={13} /> Feed stock remaining
                  </div>
                  <p className={`text-xl font-bold ${m.feedIsLow ? 'text-amber-600' : 'text-gray-900'}`}>
                    {Math.round(m.feedStock).toLocaleString()} kg
                  </p>
                  {m.feedLowestDays !== null && (
                    <p className={`text-xs mt-1 ${m.feedIsLow ? 'text-amber-600' : 'text-gray-400'}`}>
                      {m.feedIsLow && <AlertTriangle size={11} className="inline mr-1" />}
                      ~{m.feedLowestDays} days left{m.feedIsLow ? ' · reorder soon' : ''}
                    </p>
                  )}
                </Link>

                <Link href="/orders" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <CreditCard size={13} /> Outstanding payments
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(m.outstandingPayments)}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {m.outstandingCount} order{m.outstandingCount !== 1 ? 's' : ''} awaiting M-Pesa confirmation
                  </p>
                </Link>
              </div>
            </div>

            {/* Alerts & Today's Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Alerts & Actions Needed */}
              <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Bell size={16} className="text-gray-500" />
                  <h2 className="font-bold text-gray-900">Alerts & actions needed</h2>
                </div>
                {data.alerts.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
                    All clear — no urgent actions needed
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {data.alerts.map((alert, i) => (
                      <Link key={i} href={alert.link || '#'} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition">
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ALERT_COLORS[alert.type].dot}`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-500">{alert.detail}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's Tasks */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <h2 className="font-bold text-gray-900">Today&apos;s tasks</h2>
                </div>
                {data.tasks.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No tasks for today</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {data.tasks.map((task, i) => (
                      <Link key={i} href={task.link || '#'} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition">
                        {task.done ? (
                          <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle size={18} className="text-gray-300 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.label}</p>
                          {task.detail && (
                            <p className={`text-xs ${task.done ? 'text-gray-300' : 'text-amber-600'}`}>{task.detail}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Goals */}
            {data.weeklyGoals && data.weeklyGoals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">This Week&apos;s Goals</p>
                  <Link href="/goals" className="text-xs text-green-700 font-medium hover:text-green-900 flex items-center gap-1">
                    Manage goals <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.weeklyGoals.map((goal) => {
                    const pct = goal.progressPct;
                    const onTrack = pct >= 100;
                    const good = pct >= 70;
                    const atRisk = pct >= 40;
                    const barColor = onTrack ? 'bg-green-500' : good ? 'bg-green-400' : atRisk ? 'bg-amber-400' : 'bg-red-400';
                    const textColor = onTrack ? 'text-green-700' : good ? 'text-green-600' : atRisk ? 'text-amber-600' : 'text-red-600';
                    const CATEGORY_LABELS: Record<string, string> = {
                      EGG_PRODUCTION: 'Egg Production', REVENUE: 'Revenue', ORDERS: 'Orders',
                      CHICK_COUNT: 'Chick Count', MORTALITY_RATE: 'Mortality Rate',
                      EXPENSES: 'Expenses', FEED_USAGE: 'Feed Usage',
                    };
                    const isCurrency = goal.category === 'REVENUE' || goal.category === 'EXPENSES';
                    const fmt = (v: number) => isCurrency ? formatCurrency(v) : v.toLocaleString();
                    return (
                      <div key={goal.id} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Target size={13} className="text-gray-400" />
                            <span className="text-xs font-semibold text-gray-600">
                              {goal.label || CATEGORY_LABELS[goal.category] || goal.category}
                            </span>
                          </div>
                          <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                          <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span>{fmt(goal.actual)} <span className="text-gray-400">of</span> {fmt(goal.target)}</span>
                          {goal.daysRemaining > 0 && !onTrack && (
                            <span className={textColor}>need {fmt(goal.neededPace)}/day</span>
                          )}
                          {onTrack && <span className="text-green-600 font-medium">On track ✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Orders + Eggs This Week */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Recent Orders */}
              <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingCart size={16} className="text-gray-500" /> Recent orders
                  </h2>
                  <Link href="/orders" className="text-xs text-green-700 font-medium hover:text-green-900 flex items-center gap-1">
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
                {data.recentOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No active orders</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {data.recentOrders.map((order) => (
                      <div key={order.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{order.customerName}</p>
                          <p className="text-xs text-gray-500">{order.itemSummary}{order.deliveryArea ? ` · ${order.deliveryArea}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                            {order.status.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Eggs This Week */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Egg size={16} className="text-gray-500" /> Eggs this week
                  </h2>
                  <Link href="/eggs" className="text-xs text-green-700 font-medium hover:text-green-900 flex items-center gap-1">
                    Details <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">Mon–Sun · good eggs only</p>
                    <p className="text-sm font-bold text-gray-900">{data.eggsThisWeek.weekTotal.toLocaleString()} total</p>
                  </div>
                  {/* Sparkbar — good eggs per day with counts */}
                  {data.eggsThisWeek.days.length > 0 ? (
                    <>
                      <div className="flex items-end gap-1.5 mb-3" style={{ height: 100 }}>
                        {data.eggsThisWeek.days.map((d) => {
                          const maxVal = Math.max(...data.eggsThisWeek.days.map((dd) => dd.good), 1);
                          const pct = maxVal > 0 ? (d.good / maxVal) * 100 : 0;
                          const barH = d.good > 0 ? Math.max(10, pct) : 4;
                          return (
                            <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full">
                              {d.good > 0 && (
                                <span className={`text-[9px] font-semibold ${d.isToday ? 'text-green-800' : 'text-gray-500'}`}>
                                  {d.good.toLocaleString()}
                                </span>
                              )}
                              <div
                                className={`w-full rounded-sm transition-all ${d.good === 0 ? 'bg-gray-200' : d.isToday ? 'bg-green-800' : 'bg-green-300'}`}
                                style={{ height: `${barH}%` }}
                              />
                              <span className={`text-[10px] leading-none ${d.isToday ? 'font-bold text-green-800' : 'text-gray-400'}`}>
                                {d.isToday ? 'Today' : d.day}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">Daily avg</p>
                          <p className="text-lg font-bold text-gray-900">{data.eggsThisWeek.dailyAvg.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Quality rate</p>
                          <p className="text-lg font-bold text-green-700">{data.eggsThisWeek.qualityRate}%</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center text-gray-400 text-sm">
                      <Egg size={24} className="mx-auto mb-2 text-gray-300" />
                      No egg collections logged this week yet.
                      <Link href="/eggs" className="block mt-1 text-green-700 font-medium text-xs hover:underline">
                        Log collection &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FARM STATUS — Active Batches */}
            {Object.keys(data.batchesByType).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Farm Status</p>
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                      <Bird size={16} className="text-gray-500" /> Active batches
                    </h2>
                    <Link href="/batches" className="text-xs text-green-700 font-medium hover:text-green-900 flex items-center gap-1">
                      Manage batches <ArrowRight size={12} />
                    </Link>
                  </div>
                  <div>
                    {Object.entries(data.batchesByType).map(([type, batches]) => (
                      <div key={type}>
                        <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{type}</p>
                        </div>
                        {batches.map((batch) => (
                          <Link key={batch.id} href={`/batches/${batch.id}`}
                            className="flex items-center justify-between px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {batch.batchNumber} &middot; {batch.type}
                              </p>
                              <p className="text-xs text-gray-500">
                                {batch.currentCount.toLocaleString()} birds &middot; Week {batch.ageWeeks}
                                {batch.breed ? ` · ${batch.breed}` : ''}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              {batch.alerts.length > 0 ? (
                                <span className="text-xs text-red-600 font-medium">{batch.alerts[0]}</span>
                              ) : null}
                              <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">active</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Row: Revenue This Month + Inventory Snapshot + Pre-Orders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Revenue This Month */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart3 size={14} className="text-gray-400" /> Revenue this month
                </h3>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.monthSummary.revenue)}</p>
                {data.monthSummary.trend !== null && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${data.monthSummary.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {data.monthSummary.trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {data.monthSummary.trend > 0 ? '+' : ''}{data.monthSummary.trend}% vs last month
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-xs">
                  <p className="text-gray-500">Expenses: <span className="font-medium text-gray-700">{formatCurrency(data.monthSummary.expenses)}</span></p>
                  <p className={data.monthSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    Net: <span className="font-bold">{formatCurrency(data.monthSummary.netProfit)}</span>
                  </p>
                </div>
              </div>

              {/* Inventory Snapshot */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={14} className="text-gray-400" /> Inventory snapshot
                </h3>
                {data.inventorySnapshot.length === 0 ? (
                  <p className="text-sm text-gray-400">No inventory data</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.inventorySnapshot.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <p className="text-sm text-gray-700">{item.name}</p>
                        <p className={`text-sm font-semibold ${item.warning ? 'text-amber-600' : 'text-gray-900'}`}>
                          {item.value} {item.warning && <AlertTriangle size={11} className="inline ml-0.5" />}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pre-Orders Pending */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <ShoppingCart size={14} className="text-gray-400" /> Pre-orders pending
                </h3>
                <p className="text-2xl font-bold text-gray-900">{data.preOrders.count}</p>
                {data.preOrders.nextFulfilment && (
                  <p className="text-xs text-gray-500 mt-1">Next fulfilment: {data.preOrders.nextFulfilment}</p>
                )}
                {data.preOrders.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                    {data.preOrders.items.map((item, i) => (
                      <p key={i} className="text-xs text-gray-600">{item.description}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Cost of Production */}
              {data.costOfProduction && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calculator size={14} className="text-gray-400" /> Cost of production — this month
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Egg size={11} /> Cost per egg</span>
                      <span className="text-sm font-bold text-gray-900">
                        {data.costOfProduction.costPerEgg !== null
                          ? `KSh ${data.costOfProduction.costPerEgg.toFixed(2)}`
                          : <span className="text-gray-400 font-normal">No data</span>}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Bird size={11} /> Cost per bird/month</span>
                      <span className="text-sm font-bold text-gray-900">
                        {data.costOfProduction.costPerBirdMonth !== null
                          ? `KSh ${data.costOfProduction.costPerBirdMonth.toFixed(2)}`
                          : <span className="text-gray-400 font-normal">No data</span>}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-400">
                      <p>Based on KSh {data.costOfProduction.expensesThisMonth.toLocaleString()} expenses</p>
                      <p>{data.costOfProduction.eggsThisMonth.toLocaleString()} eggs · {data.costOfProduction.totalActiveBirds.toLocaleString()} birds</p>
                    </div>
                    {data.costOfProduction.batchCostBreakdown.length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1.5">Acquisition cost per chick</p>
                        {data.costOfProduction.batchCostBreakdown.map((b) => (
                          <div key={b.batchNumber} className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600">{b.batchNumber}</span>
                            <span className="font-semibold text-gray-800">
                              {b.costPerChick !== null ? `KSh ${b.costPerChick.toFixed(2)}/chick` : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              Failed to load dashboard data. Please refresh.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
