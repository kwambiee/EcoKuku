'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import { BarChart3, Download, RefreshCw, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts';

interface ReportData {
  summary: {
    totalRevenue: number; productRevenue: number; batchBookingDeposits: number; batchBookingCount: number;
    revenueTrend: number | null; totalOrders: number; ordersTrend: number | null;
    avgOrderValue: number; totalCustomers: number; newCustomersLastMonth: number;
    totalExpenses: number; netProfit: number;
  };
  revenueByCategory: { category: string; value: number }[];
  monthly: { month: string; revenue: number; expenses: number; profit: number; orders: number }[];
  topProducts: { productId: string; name: string; category: string; totalQty: number; totalRevenue: number }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  FEED: 'Feed', MEDICINE_VACCINE: 'Medicine & Vaccines', CHICKS_PURCHASE: 'Chicks Purchase',
  EQUIPMENT: 'Equipment', LABOUR: 'Labour', UTILITIES: 'Utilities',
  TRANSPORT: 'Transport', VETERINARY: 'Veterinary', OTHER: 'Other',
  EGGS: 'Eggs', LIVE_POULTRY: 'Live Poultry', DRESSED_MEAT: 'Dressed Meat',
  CHICKS: 'Chicks', BATCH_BOOKINGS: 'Batch Bookings (Deposits)',
};
const CHART_COLORS = ['#16a34a', '#dc2626', '#2563eb', '#d97706', '#7c3aed', '#0891b2'];

const fmt = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

function linearForecast(data: number[], periods: number): number[] {
  const n = data.length;
  if (n < 2) return Array(periods).fill(data[0] || 0);
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (data[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return Array.from({ length: periods }, (_, i) => Math.max(0, Math.round(intercept + slope * (n + i))));
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<{ name: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState(6);

  const fetchAll = async (months = period) => {
    setIsLoading(true);
    try {
      const [reportRes, expenseRes] = await Promise.all([
        fetch(`/api/reports?months=${months}`),
        fetch('/api/expenses?limit=200'),
      ]);
      if (reportRes.ok) setData(await reportRes.json());
      if (expenseRes.ok) {
        const expData = await expenseRes.json();
        const exps = expData.data || [];
        const byCat = Object.entries(
          exps.reduce((acc: Record<string, number>, e: any) => {
            acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
            return acc;
          }, {} as Record<string, number>)
        ).map(([cat, val]) => ({ name: CATEGORY_LABELS[cat] || cat, value: val as number }))
         .sort((a, b) => b.value - a.value);
        setExpensesByCategory(byCat);
      }
    } catch { toast.error('Failed to load reports'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const downloadCSV = () => {
    if (!data) return;
    const rows = [
      ['Month', 'Revenue (KSh)', 'Expenses (KSh)', 'Profit (KSh)', 'Orders'],
      ...data.monthly.map((m) => [m.month, m.revenue, m.expenses, m.profit, m.orders]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecokuku-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const s = data?.summary;

  const revenueByCat = (data?.revenueByCategory || [])
    .map((r) => ({ name: CATEGORY_LABELS[r.category] || r.category, value: r.value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  // Cash flow data: cumulative revenue vs cumulative expenses over months
  const cashFlowData = (data?.monthly || []).reduce((acc, m, i) => {
    const prev = i > 0 ? acc[i - 1] : { cumRevenue: 0, cumExpenses: 0 };
    acc.push({
      month: m.month,
      cumRevenue: prev.cumRevenue + m.revenue,
      cumExpenses: prev.cumExpenses + m.expenses,
      cashBalance: (prev.cumRevenue + m.revenue) - (prev.cumExpenses + m.expenses),
    });
    return acc;
  }, [] as { month: string; cumRevenue: number; cumExpenses: number; cashBalance: number }[]);

  // Revenue forecast: extend the monthly revenue trend by 3 months
  const monthlyRevenues = (data?.monthly || []).map((m) => m.revenue);
  const forecastValues = linearForecast(monthlyRevenues, 3);
  const now = new Date();
  const forecastMonths = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
    return d.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
  });
  const revenueTrendData = [
    ...(data?.monthly || []).map((m) => ({
      month: m.month,
      revenue: m.revenue,
      forecast: null as number | null,
    })),
    ...forecastValues.map((val, i) => ({
      month: forecastMonths[i],
      revenue: null as number | null,
      forecast: val,
    })),
  ];
  // Bridge point: last actual month also gets forecast value for continuous line
  if (revenueTrendData.length > 0 && data?.monthly?.length) {
    const lastActualIdx = data.monthly.length - 1;
    const lastItem = revenueTrendData[lastActualIdx];
    revenueTrendData[lastActualIdx] = {
      ...lastItem,
      forecast: lastItem.revenue as number,
    };
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 size={28} className="text-green-700" />
            <div>
              <h1 className="text-3xl font-bold">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">Revenue, expenses, and farm performance</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[{ label: '3M', value: 3 }, { label: '6M', value: 6 }, { label: '12M', value: 12 }, { label: 'All', value: 24 }].map((p) => (
                <button key={p.value} onClick={() => { setPeriod(p.value); fetchAll(p.value); }}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${period === p.value ? 'bg-white shadow text-green-800' : 'text-gray-600 hover:text-gray-900'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => fetchAll()} className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <RefreshCw size={15} /> Refresh
            </button>
            <button onClick={downloadCSV} disabled={!data}
              className="flex items-center gap-2 text-sm px-3 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Download size={15} /> Download CSV
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
                  <div className="h-7 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : s ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-green-700">{fmt(s.totalRevenue)}</p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-gray-500">Products: <span className="font-medium">{fmt(s.productRevenue)}</span></p>
                    <p className="text-xs text-gray-500">Batch deposits: <span className="font-medium">{fmt(s.batchBookingDeposits)}</span></p>
                  </div>
                  {s.revenueTrend !== null && (
                    <div className={`mt-1 flex items-center gap-1 text-xs ${s.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {s.revenueTrend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {s.revenueTrend > 0 ? '+' : ''}{s.revenueTrend}% vs last month
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">{fmt(s.totalExpenses)}</p>
                  <Link href="/expenses" className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                    View all expenses <ArrowRight size={10} />
                  </Link>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Net Profit</p>
                  <p className={`text-xl font-bold ${s.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(s.netProfit)}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Margin: {s.totalRevenue > 0 ? `${((s.netProfit / s.totalRevenue) * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Orders</p>
                  <p className="text-xl font-bold text-blue-700">{s.totalOrders.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">Avg value: {fmt(s.avgOrderValue)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Customers</p>
                  <p className="text-xl font-bold text-gray-900">{s.totalCustomers.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">+{s.newCustomersLastMonth} new last month</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Batch Bookings</p>
                  <p className="text-xl font-bold text-amber-700">{s.batchBookingCount}</p>
                  <p className="text-xs text-gray-400 mt-1">Deposits: {fmt(s.batchBookingDeposits)}</p>
                </div>
              </div>

              {/* Revenue Trend with Forecast */}
              {revenueTrendData.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="font-bold text-lg mb-1">Revenue Trend & Forecast</h2>
                  <p className="text-xs text-gray-400 mb-4">Solid line = actual revenue. Dashed line = 3-month forecast based on trend.</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={revenueTrendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => v !== null ? fmt(v) : '—'} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Actual Revenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
                      <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#16a34a" strokeWidth={2} strokeDasharray="8 4" dot={{ r: 3, strokeDasharray: '' }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Cash Flow Chart */}
              {cashFlowData.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="font-bold text-lg mb-1">Cash Flow</h2>
                  <p className="text-xs text-gray-400 mb-4">Cumulative income vs expenses over time</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={cashFlowData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="cumRevenue" name="Cumulative Revenue" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} />
                      <Area type="monotone" dataKey="cumExpenses" name="Cumulative Expenses" stroke="#dc2626" fill="#fee2e2" strokeWidth={2} />
                      <Line type="monotone" dataKey="cashBalance" name="Cash Balance" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Revenue vs Expenses Bar Chart */}
              {data?.monthly && data.monthly.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="font-bold text-lg mb-4">Monthly Revenue vs Expenses</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.monthly} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Profit" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Revenue by category + Expenses by category */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {revenueByCat.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="font-bold text-lg mb-1">Revenue by Product Category</h2>
                    <p className="text-xs text-gray-400 mb-4">Includes product sales + batch booking deposits</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={revenueByCat} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                          label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                          labelLine={false}>
                          {revenueByCat.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {revenueByCat.map((r, i) => (
                        <div key={r.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {r.name}: <span className="font-semibold">{fmt(r.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expensesByCategory.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="font-bold text-lg mb-1">Expenses by Category</h2>
                    <p className="text-xs text-gray-400 mb-4">Where your money is going</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={expensesByCategory} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                          label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                          labelLine={false}>
                          {expensesByCategory.map((_, i) => <Cell key={i} fill={['#dc2626','#f97316','#eab308','#84cc16','#06b6d4','#8b5cf6'][i % 6]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </div>

              {/* Orders trend line chart */}
              {data?.monthly && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="font-bold text-lg mb-4">Orders Trend (Last 6 Months)</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="orders" name="Orders" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Products */}
              {data?.topProducts.length ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="font-bold text-lg mb-4">Top Products by Revenue</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.topProducts} layout="vertical" margin={{ left: 120 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="totalRevenue" name="Revenue" fill="#16a34a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}

              {/* Monthly P&L Table */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-5 border-b border-gray-200">
                  <h2 className="font-bold text-lg">Monthly Profit & Loss</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Month</th>
                        <th className="px-4 py-3 text-right">Revenue</th>
                        <th className="px-4 py-3 text-right">Expenses</th>
                        <th className="px-4 py-3 text-right">Profit</th>
                        <th className="px-4 py-3 text-right">Margin</th>
                        <th className="px-4 py-3 text-right">Orders</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data?.monthly.map((row) => (
                        <tr key={row.month} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-sm">{row.month}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-green-800">{fmt(row.revenue)}</td>
                          <td className="px-4 py-3 text-right text-sm text-red-700">{fmt(row.expenses)}</td>
                          <td className={`px-4 py-3 text-right text-sm font-bold ${row.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(row.profit)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {row.revenue > 0 ? `${((row.profit / row.revenue) * 100).toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{row.orders}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr className="font-bold">
                        <td className="px-4 py-3 text-sm">Total</td>
                        <td className="px-4 py-3 text-right text-sm text-green-800">{fmt(s.totalRevenue)}</td>
                        <td className="px-4 py-3 text-right text-sm text-red-700">{fmt(s.totalExpenses)}</td>
                        <td className={`px-4 py-3 text-right text-sm ${s.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(s.netProfit)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {s.totalRevenue > 0 ? `${((s.netProfit / s.totalRevenue) * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">{s.totalOrders}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Detailed Expense Breakdown Table */}
              {expensesByCategory.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-bold text-lg">Expense Breakdown by Category</h2>
                    <Link href="/expenses" className="text-sm text-green-700 font-medium hover:text-green-900 flex items-center gap-1">
                      Manage Expenses <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left">Category</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-right">% of Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expensesByCategory.map((e) => (
                          <tr key={e.name} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.name}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-red-700">{fmt(e.value)}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {s.totalExpenses > 0 ? `${((e.value / s.totalExpenses) * 100).toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr className="font-bold">
                          <td className="px-4 py-3 text-sm">Total</td>
                          <td className="px-4 py-3 text-right text-sm text-red-700">{fmt(s.totalExpenses)}</td>
                          <td className="px-4 py-3 text-right text-sm">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : <div className="bg-white rounded-lg border p-8 text-center text-gray-500">Failed to load data</div>}
        </div>
      </main>
    </div>
  );
}
