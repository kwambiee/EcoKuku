'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import {
  BarChart3, Download, RefreshCw, TrendingUp, TrendingDown, Calendar,
  FileText, ArrowRight, Feather, AlertTriangle, Users,
} from 'lucide-react';
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
  topCustomers: { customerId: string; name: string; email: string; orderCount: number; totalSpent: number }[];
  expensesByCategory: { category: string; amount: number }[];
  eggTrend30d: { date: string; collected: number }[];
  mortalityByBatch: { id: string; batchNumber: string; type: string; quantity: number; currentCount: number; totalDead: number; mortalityRate: number; ageInDays: number }[];
  feedEfficiency: { totalFeedCost: number; activeBirds: number; eggsLast30d: number; feedCostPerBird: number; feedCostPerEgg: number };
  dailyRevenue60d: { date: string; revenue: number }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  FEED: 'Feed', MEDICINE_VACCINE: 'Medicine & Vaccines', CHICKS_PURCHASE: 'Chicks Purchase',
  EQUIPMENT: 'Equipment', LABOUR: 'Labour', UTILITIES: 'Utilities',
  TRANSPORT: 'Transport', VETERINARY: 'Veterinary', OTHER: 'Other',
  EGGS: 'Eggs', LIVE_POULTRY: 'Live Poultry', DRESSED_MEAT: 'Dressed Meat',
  CHICKS: 'Chicks', BATCH_BOOKINGS: 'Batch Bookings',
};
const EXPENSE_COLORS = ['#dc2626','#f97316','#eab308','#84cc16','#06b6d4','#8b5cf6','#ec4899','#14b8a6'];
const REV_COLORS = ['#16a34a','#2563eb','#d97706','#7c3aed','#0891b2','#dc2626'];

const fmt = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
const fmtShort = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(Math.round(n));

function linearForecast(data: number[], periods: number): number[] {
  const n = data.length;
  if (n < 2) return Array(periods).fill(data[0] || 0);
  const xMean = (n - 1) / 2, yMean = data.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - xMean) * (data[i] - yMean); den += (i - xMean) ** 2; }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return Array.from({ length: periods }, (_, i) => Math.max(0, Math.round(intercept + slope * (n + i))));
}

const PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
  { label: 'YTD', ytd: true },
  { label: 'All', all: true },
];

function presetToDates(p: typeof PRESETS[0]): { startDate: string; endDate: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  if (p.days) {
    const s = new Date(now); s.setDate(s.getDate() - p.days + 1);
    return { startDate: s.toISOString().slice(0, 10), endDate: end };
  }
  if (p.months) {
    const s = new Date(now.getFullYear(), now.getMonth() - p.months + 1, 1);
    return { startDate: s.toISOString().slice(0, 10), endDate: end };
  }
  if (p.ytd) return { startDate: `${now.getFullYear()}-01-01`, endDate: end };
  // All: go back 3 years
  return { startDate: `${now.getFullYear() - 3}-01-01`, endDate: end };
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('6M');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const fetchData = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true);
    try {
      const url = new URL('/api/reports', window.location.origin);
      if (startDate && endDate) {
        url.searchParams.set('startDate', startDate);
        url.searchParams.set('endDate', endDate);
      } else {
        url.searchParams.set('months', '6');
      }
      const res = await fetch(url);
      if (res.ok) setData(await res.json());
      else toast.error('Failed to load report');
    } catch { toast.error('Failed to load report'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    const p = PRESETS.find((x) => x.label === '6M')!;
    const { startDate, endDate } = presetToDates(p);
    fetchData(startDate, endDate);
  }, [fetchData]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.label);
    setShowCustom(false);
    const { startDate, endDate } = presetToDates(preset);
    fetchData(startDate, endDate);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) { toast.error('Select both start and end dates'); return; }
    if (customEnd < customStart) { toast.error('End date must be after start date'); return; }
    setActivePreset('Custom');
    fetchData(customStart, customEnd);
  };

  const downloadCSV = () => {
    if (!data) return;
    const rows: (string | number)[][] = [
      ['EcoKuku Farm — Profit & Loss Report'],
      ['Generated:', new Date().toLocaleDateString('en-KE')],
      [],
      ['SUMMARY'],
      ['Total Revenue', data.summary.totalRevenue],
      ['Total Expenses', data.summary.totalExpenses],
      ['Net Profit', data.summary.netProfit],
      ['Profit Margin', data.summary.totalRevenue > 0 ? `${((data.summary.netProfit / data.summary.totalRevenue) * 100).toFixed(1)}%` : '—'],
      ['Total Orders', data.summary.totalOrders],
      ['Avg Order Value', data.summary.avgOrderValue],
      [],
      ['MONTHLY BREAKDOWN'],
      ['Month', 'Revenue (KSh)', 'Expenses (KSh)', 'Profit (KSh)', 'Margin', 'Orders'],
      ...data.monthly.map((m) => [
        m.month, m.revenue, m.expenses, m.profit,
        m.revenue > 0 ? `${((m.profit / m.revenue) * 100).toFixed(1)}%` : '—', m.orders,
      ]),
      [],
      ['REVENUE BY SOURCE'],
      ['Category', 'Revenue (KSh)'],
      ...data.revenueByCategory.map((r) => [CATEGORY_LABELS[r.category] || r.category, r.value]),
      [],
      ['EXPENSES BY CATEGORY'],
      ['Category', 'Amount (KSh)'],
      ...data.expensesByCategory.map((e) => [CATEGORY_LABELS[e.category] || e.category, e.amount]),
      [],
      ['TOP PRODUCTS'],
      ['Product', 'Category', 'Units Sold', 'Revenue (KSh)'],
      ...data.topProducts.map((p) => [p.name, CATEGORY_LABELS[p.category] || p.category, p.totalQty, p.totalRevenue]),
      [],
      ['TOP CUSTOMERS'],
      ['Customer', 'Orders', 'Total Spent (KSh)'],
      ...data.topCustomers.map((c) => [c.name, c.orderCount, c.totalSpent]),
    ];

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `ecokuku-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Ledger CSV downloaded');
  };

  const printReport = () => {
    if (!data) return;
    const s = data.summary;
    const html = `<!DOCTYPE html><html><head><title>EcoKuku Farm Report — ${new Date().toLocaleDateString('en-KE')}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #14532d; }
  h2 { font-size: 16px; margin: 24px 0 10px; border-bottom: 2px solid #14532d; padding-bottom: 4px; color: #14532d; }
  .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .kpi-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
  .kpi-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
  .green { color: #16a34a; } .red { color: #dc2626; } .blue { color: #2563eb; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
  .best { background: #dcfce7; } .worst { background: #fee2e2; }
  .text-right { text-align: right; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>EcoKuku Farm — P&L Report</h1>
<p class="meta">Generated: ${new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })}</p>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">Total Revenue</div><div class="kpi-value green">${fmt(s.totalRevenue)}</div></div>
  <div class="kpi"><div class="kpi-label">Total Expenses</div><div class="kpi-value red">${fmt(s.totalExpenses)}</div></div>
  <div class="kpi"><div class="kpi-label">Net Profit</div><div class="kpi-value ${s.netProfit >= 0 ? 'green' : 'red'}">${fmt(s.netProfit)}</div></div>
  <div class="kpi"><div class="kpi-label">Orders</div><div class="kpi-value blue">${s.totalOrders}</div></div>
</div>
<h2>Monthly Profit & Loss</h2>
<table><thead><tr><th>Month</th><th class="text-right">Revenue</th><th class="text-right">Expenses</th><th class="text-right">Profit</th><th class="text-right">Margin</th><th class="text-right">Orders</th></tr></thead><tbody>
${(() => {
  const profits = data.monthly.map((m) => m.profit);
  const bestProfit = Math.max(...profits);
  const worstProfit = Math.min(...profits);
  return data.monthly.map((m) => {
    const cls = m.profit === bestProfit ? 'best' : m.profit === worstProfit ? 'worst' : '';
    return `<tr class="${cls}"><td>${m.month}</td><td class="text-right">${fmt(m.revenue)}</td><td class="text-right">${fmt(m.expenses)}</td><td class="text-right">${fmt(m.profit)}</td><td class="text-right">${m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(1) + '%' : '—'}</td><td class="text-right">${m.orders}</td></tr>`;
  }).join('');
})()}
</tbody></table>
<h2>Revenue by Source</h2>
<table><thead><tr><th>Category</th><th class="text-right">Revenue</th></tr></thead><tbody>
${data.revenueByCategory.map((r) => `<tr><td>${CATEGORY_LABELS[r.category] || r.category}</td><td class="text-right">${fmt(r.value)}</td></tr>`).join('')}
</tbody></table>
<h2>Expense Breakdown</h2>
<table><thead><tr><th>Category</th><th class="text-right">Amount</th></tr></thead><tbody>
${data.expensesByCategory.map((e) => `<tr><td>${CATEGORY_LABELS[e.category] || e.category}</td><td class="text-right">${fmt(e.amount)}</td></tr>`).join('')}
</tbody></table>
<h2>Top Products</h2>
<table><thead><tr><th>Product</th><th class="text-right">Units</th><th class="text-right">Revenue</th></tr></thead><tbody>
${data.topProducts.map((p) => `<tr><td>${p.name}</td><td class="text-right">${p.totalQty}</td><td class="text-right">${fmt(p.totalRevenue)}</td></tr>`).join('')}
</tbody></table>
<h2>Top Customers</h2>
<table><thead><tr><th>Customer</th><th class="text-right">Orders</th><th class="text-right">Total Spent</th></tr></thead><tbody>
${data.topCustomers.map((c, i) => `<tr><td>#${i + 1} ${c.name}</td><td class="text-right">${c.orderCount}</td><td class="text-right">${fmt(c.totalSpent)}</td></tr>`).join('')}
</tbody></table>
<script>window.onload = () => window.print();</script></body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // Derived chart data
  const s = data?.summary;

  const revenueByCat = (data?.revenueByCategory || [])
    .map((r) => ({ name: CATEGORY_LABELS[r.category] || r.category, value: r.value }))
    .filter((r) => r.value > 0).sort((a, b) => b.value - a.value);

  const expenseByCat = (data?.expensesByCategory || [])
    .map((e) => ({ name: CATEGORY_LABELS[e.category] || e.category, value: e.amount }))
    .filter((e) => e.value > 0);

  const cashFlowData = (data?.monthly || []).reduce((acc, m, i) => {
    const prev = i > 0 ? acc[i - 1] : { cumRevenue: 0, cumExpenses: 0, cashBalance: 0 };
    const cumRevenue = prev.cumRevenue + m.revenue;
    const cumExpenses = prev.cumExpenses + m.expenses;
    acc.push({ month: m.month, cumRevenue, cumExpenses, cashBalance: cumRevenue - cumExpenses });
    return acc;
  }, [] as { month: string; cumRevenue: number; cumExpenses: number; cashBalance: number }[]);

  // Revenue trend + 3-month forecast
  const monthlyRevenues = (data?.monthly || []).map((m) => m.revenue);
  const forecastValues = linearForecast(monthlyRevenues, 3);
  const now = new Date();
  const forecastMonths = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
    return d.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
  });
  const revenueTrendData = [
    ...(data?.monthly || []).map((m, idx, arr) => ({
      month: m.month, revenue: m.revenue,
      forecast: idx === arr.length - 1 ? m.revenue : null as number | null,
    })),
    ...forecastValues.map((val, i) => ({ month: forecastMonths[i], revenue: null as number | null, forecast: val })),
  ];

  // 30-day daily revenue forecast
  const dailyRevs = (data?.dailyRevenue60d || []).slice(0, 30).map((d) => d.revenue);
  const dailyForecastValues = linearForecast(dailyRevs, 30);
  const daily30dForecastData = [
    ...(data?.dailyRevenue60d?.slice(30) || []).map((d) => ({
      date: d.date.slice(5), // MM-DD
      actual: d.revenue, forecast: null as number | null,
    })),
    ...dailyForecastValues.map((val, i) => {
      const d = new Date(now); d.setDate(d.getDate() + i + 1);
      return { date: d.toISOString().slice(5, 10), actual: null as number | null, forecast: val };
    }),
  ];
  // bridge last actual point
  if (daily30dForecastData.length > 0 && data?.dailyRevenue60d?.length === 60) {
    const lastActualIdx = 29;
    if (daily30dForecastData[lastActualIdx]) {
      daily30dForecastData[lastActualIdx] = { ...daily30dForecastData[lastActualIdx], forecast: daily30dForecastData[lastActualIdx].actual } as { date: string; actual: number; forecast: number | null };
    }
  }

  // Best/worst months
  const profits = (data?.monthly || []).map((m) => m.profit);
  const bestProfit = profits.length > 0 ? Math.max(...profits) : null;
  const worstProfit = profits.length > 0 ? Math.min(...profits) : null;

  const LoadingCard = () => <div className="bg-white rounded-lg border p-6 animate-pulse"><div className="h-3 bg-gray-200 rounded w-1/2 mb-3" /><div className="h-7 bg-gray-200 rounded w-2/3" /></div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 size={26} className="text-green-700" />
              <div>
                <h1 className="text-2xl font-bold">Reports & Analytics</h1>
                <p className="text-gray-500 text-sm">Revenue, P&L, egg production, feed efficiency, and farm performance</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { const p = PRESETS.find((x) => x.label === activePreset); if (p) applyPreset(p); else fetchData(); }}
                className="flex items-center gap-1.5 text-sm px-3 py-2 border rounded-lg hover:bg-gray-50">
                <RefreshCw size={14} /> Refresh
              </button>
              <button onClick={downloadCSV} disabled={!data}
                className="flex items-center gap-1.5 text-sm px-3 py-2 border border-green-700 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50">
                <Download size={14} /> Ledger CSV
              </button>
              <button onClick={printReport} disabled={!data}
                className="flex items-center gap-1.5 text-sm px-3 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                <FileText size={14} /> Export PDF
              </button>
            </div>
          </div>

          {/* Date range picker */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${activePreset === p.label ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setShowCustom(!showCustom)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${activePreset === 'Custom' ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Custom
            </button>
            {showCustom && (
              <div className="flex flex-wrap items-center gap-2 ml-2">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs border rounded px-2 py-1.5 focus:ring-1 focus:ring-green-500 focus:outline-none" />
                <span className="text-gray-400 text-xs">to</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs border rounded px-2 py-1.5 focus:ring-1 focus:ring-green-500 focus:outline-none" />
                <button onClick={applyCustom}
                  className="text-xs px-3 py-1.5 bg-green-800 text-white rounded hover:bg-green-700">Apply</button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <LoadingCard key={i} />)}
            </div>
          ) : !s ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">Failed to load data</div>
          ) : (
            <>
              {/* P&L KPI Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-green-700">{fmt(s.totalRevenue)}</p>
                  <p className="text-xs text-gray-400 mt-1">Products: {fmt(s.productRevenue)}</p>
                  <p className="text-xs text-gray-400">Deposits: {fmt(s.batchBookingDeposits)}</p>
                  {s.revenueTrend !== null && (
                    <div className={`mt-1 flex items-center gap-1 text-xs ${s.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {s.revenueTrend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {s.revenueTrend > 0 ? '+' : ''}{s.revenueTrend}% vs last month
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">{fmt(s.totalExpenses)}</p>
                  <Link href="/expenses" className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                    View expenses <ArrowRight size={10} />
                  </Link>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Net Profit</p>
                  <p className={`text-xl font-bold ${s.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(s.netProfit)}</p>
                  <p className="text-xs text-gray-400 mt-1">Margin: {s.totalRevenue > 0 ? `${((s.netProfit / s.totalRevenue) * 100).toFixed(1)}%` : '—'}</p>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <p className="text-xs text-gray-500 uppercase mb-1">Total Orders</p>
                  <p className="text-xl font-bold text-blue-700">{s.totalOrders.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">Avg value: {fmt(s.avgOrderValue)}</p>
                </div>
              </div>

              {/* Operational metrics row */}
              {data?.feedEfficiency && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Feather size={15} className="text-orange-500" />
                      <p className="text-xs text-gray-500 uppercase">Eggs (Last 30d)</p>
                    </div>
                    <p className="text-xl font-bold">{data.feedEfficiency.eggsLast30d.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">~{Math.round(data.feedEfficiency.eggsLast30d / 30)}/day avg</p>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={15} className="text-green-600" />
                      <p className="text-xs text-gray-500 uppercase">Active Birds</p>
                    </div>
                    <p className="text-xl font-bold">{data.feedEfficiency.activeBirds.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">Across active batches</p>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={15} className="text-amber-500" />
                      <p className="text-xs text-gray-500 uppercase">Mortality</p>
                    </div>
                    {data.mortalityByBatch.length > 0 ? (
                      <>
                        <p className="text-xl font-bold">
                          {data.mortalityByBatch.reduce((s, b) => s + b.totalDead, 0).toLocaleString()} birds
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Avg {(data.mortalityByBatch.reduce((s, b) => s + b.mortalityRate, 0) / data.mortalityByBatch.length).toFixed(1)}% rate
                        </p>
                      </>
                    ) : <p className="text-xl font-bold text-gray-400">—</p>}
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 size={15} className="text-purple-600" />
                      <p className="text-xs text-gray-500 uppercase">Feed Efficiency</p>
                    </div>
                    <p className="text-xl font-bold text-purple-700">
                      {data.feedEfficiency.feedCostPerBird > 0 ? fmt(data.feedEfficiency.feedCostPerBird) : '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">per bird (total feed cost)</p>
                    {data.feedEfficiency.feedCostPerEgg > 0 && (
                      <p className="text-xs text-gray-400">{fmt(data.feedEfficiency.feedCostPerEgg)} per egg</p>
                    )}
                  </div>
                </div>
              )}

              {/* Revenue Trend + Forecast */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="font-bold text-lg mb-0.5">Revenue Trend & 3-Month Forecast</h2>
                <p className="text-xs text-gray-400 mb-4">Solid = actual. Dashed = forecast based on linear trend.</p>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={revenueTrendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => v !== null ? fmt(Number(v)) : '—'} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
                    <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#16a34a" strokeWidth={2} strokeDasharray="8 4" dot={{ r: 3, strokeDasharray: '' }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 30-Day Daily Sales Forecast + Cash Flow */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="font-bold text-lg mb-0.5">Sales Forecast — Next 30 Days</h2>
                  <p className="text-xs text-gray-400 mb-4">Actual last 30 days (solid) + projected next 30 days (dashed)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={daily30dForecastData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
                      <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => v !== null ? fmt(Number(v)) : '—'} />
                      <Line type="monotone" dataKey="actual" name="Actual" stroke="#16a34a" strokeWidth={1.5} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg border p-6">
                  <h2 className="font-bold text-lg mb-0.5">Cash Flow</h2>
                  <p className="text-xs text-gray-400 mb-4">Cumulative revenue vs expenses over the period</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={cashFlowData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Legend iconSize={10} />
                      <Area type="monotone" dataKey="cumRevenue" name="Cum. Revenue" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} />
                      <Area type="monotone" dataKey="cumExpenses" name="Cum. Expenses" stroke="#dc2626" fill="#fee2e2" strokeWidth={2} />
                      <Line type="monotone" dataKey="cashBalance" name="Cash Balance" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Egg Production 30-day trend */}
              {(data?.eggTrend30d || []).some((e) => e.collected > 0) && (
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="font-bold text-lg mb-0.5">Egg Production — Last 30 Days</h2>
                  <p className="text-xs text-gray-400 mb-4">
                    Total: <strong>{data!.feedEfficiency.eggsLast30d.toLocaleString()} eggs</strong> collected
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data!.eggTrend30d} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4}
                        tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip labelFormatter={(l: string) => `Date: ${l}`} formatter={(v: any) => [v, 'Eggs collected']} />
                      <Area type="monotone" dataKey="collected" name="Eggs collected" stroke="#f97316" fill="#fed7aa" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Monthly Revenue vs Expenses bar */}
              {data?.monthly && data.monthly.length > 0 && (
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="font-bold text-lg mb-4">Monthly Revenue vs Expenses</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.monthly} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Profit" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Revenue by Source + Expenses by Category */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {revenueByCat.length > 0 && (
                  <div className="bg-white rounded-lg border p-6">
                    <h2 className="font-bold text-lg mb-1">Revenue by Source</h2>
                    <p className="text-xs text-gray-400 mb-4">Product sales + batch deposits</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={revenueByCat} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                          label={({ percent }) => percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : ''}
                          labelLine={false}>
                          {revenueByCat.map((_, i) => <Cell key={i} fill={REV_COLORS[i % REV_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {revenueByCat.map((r, i) => (
                        <div key={r.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: REV_COLORS[i % REV_COLORS.length] }} />
                          {r.name}: <span className="font-semibold ml-0.5">{fmt(r.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expenseByCat.length > 0 && (
                  <div className="bg-white rounded-lg border p-6">
                    <h2 className="font-bold text-lg mb-1">Expense Breakdown</h2>
                    <p className="text-xs text-gray-400 mb-4">Where your money is going</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={expenseByCat} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                          label={({ percent }) => percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : ''}
                          labelLine={false}>
                          {expenseByCat.map((_, i) => <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {expenseByCat.map((e, i) => (
                        <div key={e.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                          {e.name}: <span className="font-semibold ml-0.5">{fmt(e.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top Customers + Mortality per Batch */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data?.topCustomers && data.topCustomers.length > 0 && (
                  <div className="bg-white rounded-lg border">
                    <div className="p-5 border-b flex items-center justify-between">
                      <h2 className="font-bold text-lg">Top Customers by Spend</h2>
                      <Link href="/customers" className="text-xs text-green-700 hover:text-green-900 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {data.topCustomers.map((c, i) => (
                        <div key={c.customerId} className="px-5 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-800' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                              <p className="text-[10px] text-gray-400">{c.orderCount} orders</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-green-800">{fmt(c.totalSpent)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data?.mortalityByBatch && data.mortalityByBatch.length > 0 && (
                  <div className="bg-white rounded-lg border">
                    <div className="p-5 border-b">
                      <h2 className="font-bold text-lg">Mortality by Active Batch</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Current live birds vs. starting count</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs text-gray-500">Batch</th>
                            <th className="px-4 py-2.5 text-right text-xs text-gray-500">Started</th>
                            <th className="px-4 py-2.5 text-right text-xs text-gray-500">Current</th>
                            <th className="px-4 py-2.5 text-right text-xs text-gray-500">Lost</th>
                            <th className="px-4 py-2.5 text-right text-xs text-gray-500">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.mortalityByBatch.map((b) => (
                            <tr key={b.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5">
                                <p className="font-medium">{b.batchNumber}</p>
                                <p className="text-[10px] text-gray-400">{b.type} · {b.ageInDays}d old</p>
                              </td>
                              <td className="px-4 py-2.5 text-right">{b.quantity}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-green-800">{b.currentCount}</td>
                              <td className="px-4 py-2.5 text-right text-red-600">{b.totalDead > 0 ? b.totalDead : '—'}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${b.mortalityRate > 10 ? 'bg-red-100 text-red-700' : b.mortalityRate > 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                  {b.mortalityRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Products */}
              {data?.topProducts.length ? (
                <div className="bg-white rounded-lg border p-6">
                  <h2 className="font-bold text-lg mb-4">Top-Selling Products</h2>
                  <ResponsiveContainer width="100%" height={Math.max(160, data.topProducts.length * 36)}>
                    <BarChart data={data.topProducts} layout="vertical" margin={{ left: 140, right: 20, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Bar dataKey="totalRevenue" name="Revenue" fill="#16a34a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-max text-sm">
                      <thead className="border-t"><tr>
                        <th className="px-2 py-2 text-left text-xs text-gray-500">Product</th>
                        <th className="px-2 py-2 text-right text-xs text-gray-500">Units Sold</th>
                        <th className="px-2 py-2 text-right text-xs text-gray-500">Revenue</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.topProducts.map((p) => (
                          <tr key={p.productId} className="hover:bg-gray-50">
                            <td className="px-2 py-2 font-medium">{p.name}</td>
                            <td className="px-2 py-2 text-right text-gray-600">{p.totalQty}</td>
                            <td className="px-2 py-2 text-right font-semibold text-green-800">{fmt(p.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* Monthly P&L Table — best/worst highlighted */}
              <div className="bg-white rounded-lg border">
                <div className="p-5 border-b flex items-center justify-between">
                  <h2 className="font-bold text-lg">Monthly Profit & Loss</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 inline-block" /> Best month</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Worst month</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-600 border-b">
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
                      {data?.monthly.map((row) => {
                        const isBest = row.profit === bestProfit && profits.length > 1;
                        const isWorst = row.profit === worstProfit && profits.length > 1;
                        return (
                          <tr key={row.month} className={`${isBest ? 'bg-green-50' : isWorst ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 font-medium text-sm">
                              {row.month}
                              {isBest && <span className="ml-2 text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-semibold">Best</span>}
                              {isWorst && <span className="ml-2 text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-semibold">Worst</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-green-800">{fmt(row.revenue)}</td>
                            <td className="px-4 py-3 text-right text-sm text-red-700">{fmt(row.expenses)}</td>
                            <td className={`px-4 py-3 text-right text-sm font-bold ${row.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(row.profit)}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {row.revenue > 0 ? `${((row.profit / row.revenue) * 100).toFixed(1)}%` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">{row.orders}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                      <tr>
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

              {/* Expense Breakdown Table */}
              {expenseByCat.length > 0 && (
                <div className="bg-white rounded-lg border">
                  <div className="p-5 border-b flex items-center justify-between">
                    <h2 className="font-bold text-lg">Expense Breakdown</h2>
                    <Link href="/expenses" className="text-sm text-green-700 font-medium hover:text-green-900 flex items-center gap-1">
                      Manage Expenses <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-600 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left">Category</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-right">% of Total</th>
                          <th className="px-4 py-3 text-left">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expenseByCat.map((e) => {
                          const pct = s.totalExpenses > 0 ? (e.value / s.totalExpenses) * 100 : 0;
                          return (
                            <tr key={e.name} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium">{e.name}</td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-red-700">{fmt(e.value)}</td>
                              <td className="px-4 py-3 text-right text-sm text-gray-600">{pct.toFixed(1)}%</td>
                              <td className="px-4 py-3">
                                <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[120px]">
                                  <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t font-bold">
                        <tr>
                          <td className="px-4 py-3 text-sm">Total</td>
                          <td className="px-4 py-3 text-right text-sm text-red-700">{fmt(s.totalExpenses)}</td>
                          <td className="px-4 py-3 text-right text-sm">100%</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
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
