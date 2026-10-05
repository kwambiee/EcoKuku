'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency } from '@ecokuku/ui';
import Link from 'next/link';
import {
  DollarSign, ShoppingCart, Egg, Bird, Wheat, CreditCard,
  Bell, CheckCircle, AlertTriangle, ArrowRight, TrendingUp, TrendingDown,
  Package, Target, Calculator, Plus, Trash2, Syringe,
  X, Phone, Clock, ChevronDown, ChevronUp, MessageSquare,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface KanbanTask {
  id: string; taskDate: string; label: string; detail?: string;
  done: boolean; status: string; priority: string; category?: string;
  deadline?: string; duration?: string; assignedPhone?: string;
  createdBy?: string; createdAt: string;
}

interface VaccineItem {
  vaccine: string; daysOld: number; windowEnd: number;
  daysUntilDue: number; status: 'done' | 'overdue' | 'due_now' | 'due_soon' | 'upcoming';
}

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
  carriedOver: { label: string; detail: string; link?: string }[];
  recentOrders: { id: string; orderNumber: string; status: string; total: number; customerName: string; itemSummary: string; deliveryArea: string }[];
  eggsThisWeek: { days: { day: string; collected: number; good: number; isToday: boolean }[]; weekTotal: number; dailyAvg: number; qualityRate: string };
  batchesByType: Record<string, { id: string; batchNumber: string; type: string; currentCount: number; ageWeeks: number; breed?: string; alerts: string[] }[]>;
  monthSummary: { revenue: number; expenses: number; netProfit: number; trend: number | null };
  inventorySnapshot: { name: string; value: string; warning?: boolean }[];
  preOrders: { count: number; nextFulfilment: string | null; items: { description: string }[] };
  lowStockProducts: { id: string; name: string; stock: number; category: string }[];
  weeklyGoals: { id: string; category: string; label: string | null; target: number; actual: number; progressPct: number; isLowerBetter: boolean; currentPace: number; neededPace: number; daysRemaining: number }[];
  costOfProduction: {
    costPerEgg: number | null; costPerBirdMonth: number | null;
    feedCostPerBird: number | null; feedCostPerBirdDay: number | null;
    feedCostThisMonth: number; eggsThisMonth: number;
    expensesThisMonth: number; totalActiveBirds: number; daysInMonth: number;
    batchCostBreakdown: { batchNumber: string; costPerChick: number | null; totalAcquisitionCost: number; initialCount: number; currentCount: number }[];
  } | null;
  vaccinationSchedule: { batchId: string; batchNumber: string; batchType: string; ageInDays: number; items: VaccineItem[] }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', PAID: 'bg-cyan-100 text-cyan-800',
  PROCESSING: 'bg-blue-100 text-blue-800', PACKED: 'bg-indigo-100 text-indigo-800',
  OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800', DELIVERED: 'bg-green-100 text-green-800',
};

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-amber-100 text-amber-700', LOW: 'bg-gray-100 text-gray-600',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  feed: <Wheat size={13} className="text-amber-500 flex-shrink-0" />,
  eggs: <Egg size={13} className="text-yellow-500 flex-shrink-0" />,
  vaccination: <Syringe size={13} className="text-purple-500 flex-shrink-0" />,
  products: <Package size={13} className="text-blue-500 flex-shrink-0" />,
  general: <Clock size={13} className="text-gray-400 flex-shrink-0" />,
};

const VACC_STATUS_STYLES: Record<string, string> = {
  overdue: 'bg-red-100 text-red-700',
  due_now: 'bg-orange-100 text-orange-700',
  due_soon: 'bg-amber-100 text-amber-700',
  upcoming: 'bg-gray-100 text-gray-600',
  done: 'bg-green-100 text-green-700',
};

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
function alertKey(a: { type: string; title: string; detail: string }) { return `alert::${a.type}::${a.title}::${a.detail}`; }

// ── WA helper ─────────────────────────────────────────────────────────────────

function waLink(phone: string, text: string) {
  const num = phone.replace(/\D/g, '').replace(/^0/, '254');
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  // Kanban create form
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ label: '', detail: '', priority: 'MEDIUM', category: 'general', deadline: '', duration: '', assignedPhone: '' });
  const [creating, setCreating] = useState(false);
  const createRef = useRef<HTMLInputElement>(null);

  // Vaccination section expand
  const [vaccOpen, setVaccOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('kpf_dismissed_alerts') || '[]') as { key: string; at: number }[];
      const valid = raw.filter((r) => Date.now() - r.at < DISMISS_TTL_MS);
      if (valid.length !== raw.length) localStorage.setItem('kpf_dismissed_alerts', JSON.stringify(valid));
      setDismissedKeys(new Set(valid.map((r) => r.key)));
    } catch { /* */ }
  }, []);

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then(setData).catch(() => {}).finally(() => setIsLoading(false));
    fetch(`/api/daily-tasks?date=${today}`).then((r) => r.json()).then((t) => setTasks(Array.isArray(t) ? t : [])).catch(() => {});
  }, []);

  useEffect(() => { if (showCreate) setTimeout(() => createRef.current?.focus(), 60); }, [showCreate]);

  function dismissAlert(alert: { type: string; title: string; detail: string }) {
    const key = alertKey(alert);
    setDismissedKeys((prev) => new Set([...prev, key]));
    try {
      const raw = JSON.parse(localStorage.getItem('kpf_dismissed_alerts') || '[]') as { key: string; at: number }[];
      raw.push({ key, at: Date.now() });
      localStorage.setItem('kpf_dismissed_alerts', JSON.stringify(raw));
    } catch { /* */ }
  }

  async function updateStatus(task: KanbanTask, status: 'OPEN' | 'IN_PROGRESS' | 'DONE') {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status, done: status === 'DONE' } : t));
    await fetch(`/api/daily-tasks/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (status === 'DONE' && task.category === 'vaccination') {
      try {
        const meta = JSON.parse(task.detail || '{}');
        if (meta.batchId && meta.vaccineType) {
          await fetch('/api/health-logs', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vaccineType: meta.vaccineType,
              batchId: meta.batchId,
              dateAdministered: new Date().toISOString().split('T')[0],
              notes: 'Logged automatically via Kanban task',
            }),
          });
        }
      } catch { /* non-critical */ }
    }
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/daily-tasks/${id}`, { method: 'DELETE' });
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.label.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/daily-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, taskDate: today }),
      });
      const t = await res.json();
      setTasks((prev) => [t, ...prev]);
      setNewTask({ label: '', detail: '', priority: 'MEDIUM', category: 'general', deadline: '', duration: '', assignedPhone: '' });
      setShowCreate(false);
    } catch { } finally { setCreating(false); }
  }

  function createFromAlert(alert: { type: 'red' | 'amber' | 'blue'; title: string; detail: string; link?: string }) {
    setNewTask((prev) => ({ ...prev, label: alert.title, detail: alert.detail, category: 'general', priority: 'HIGH' }));
    setShowCreate(true);
    dismissAlert(alert);
    window.scrollTo({ top: document.getElementById('kanban')?.offsetTop ?? 0, behavior: 'smooth' });
  }

  const m = data?.metrics;
  const cop = data?.costOfProduction;
  const visibleAlerts = (data?.alerts ?? []).filter((a) => !dismissedKeys.has(alertKey(a)));
  const alertCount = visibleAlerts.filter((a) => a.type === 'red' || a.type === 'amber').length;

  const openTasks = tasks.filter((t) => t.status === 'OPEN');
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter((t) => t.status === 'DONE');

  // ── Render ──────────────────────────────────────────────────────────────────

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
            <p className="text-sm text-gray-500 mt-0.5">{data?.greeting.date || ''} · Kwamboka Poultry Farm</p>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium">
              <Bell size={15} /> {alertCount} purchase alert{alertCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"><div className="h-3 bg-gray-200 rounded w-1/2 mb-3" /><div className="h-7 bg-gray-200 rounded w-2/3" /></div>)}
          </div>
        ) : data && m ? (
          <div className="p-4 sm:p-6 space-y-5">

            {/* ── COST PER BIRD (top priority) ── */}
            {cop && (cop.costPerBirdMonth !== null || cop.feedCostPerBird !== null) && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-gray-900 flex items-center gap-2">
                  <Calculator size={14} className="text-amber-400" />
                  <span className="text-sm font-bold text-white">Cost per Bird — {new Date().toLocaleString('default', { month: 'long' })}</span>
                  <span className="ml-auto text-xs text-gray-400">Based on {cop.totalActiveBirds.toLocaleString()} active birds · feed logs + expenses</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1">Feed cost / bird / day</p>
                    <p className="text-xl font-bold text-gray-900">
                      {cop.feedCostPerBirdDay !== null ? `KSh ${cop.feedCostPerBirdDay.toFixed(2)}` : <span className="text-gray-400 text-sm font-normal">No feed data</span>}
                    </p>
                    {cop.feedCostThisMonth > 0 && <p className="text-[11px] text-gray-400 mt-0.5">KSh {cop.feedCostThisMonth.toLocaleString()} feed this month</p>}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1">Total cost / bird / month</p>
                    <p className="text-xl font-bold text-gray-900">
                      {cop.costPerBirdMonth !== null ? `KSh ${cop.costPerBirdMonth.toFixed(2)}` : <span className="text-gray-400 text-sm font-normal">No data</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">All expenses ÷ birds</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Egg size={10} /> Cost per egg</p>
                    <p className="text-xl font-bold text-gray-900">
                      {cop.costPerEgg !== null ? `KSh ${cop.costPerEgg.toFixed(2)}` : <span className="text-gray-400 text-sm font-normal">No eggs yet</span>}
                    </p>
                    {cop.eggsThisMonth > 0 && <p className="text-[11px] text-gray-400 mt-0.5">{cop.eggsThisMonth.toLocaleString()} eggs this month</p>}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-1">Total expenses this month</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(cop.expensesThisMonth)}</p>
                    {cop.feedCostThisMonth > 0 && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Feed: {formatCurrency(cop.feedCostThisMonth)} · Other: {formatCurrency(Math.max(0, cop.expensesThisMonth - cop.feedCostThisMonth))}
                      </p>
                    )}
                  </div>
                </div>
                {cop.batchCostBreakdown.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-1">
                    <p className="text-[11px] text-gray-400 w-full mb-0.5">Acquisition cost per chick:</p>
                    {cop.batchCostBreakdown.map((b) => (
                      <span key={b.batchNumber} className="text-xs text-gray-600">
                        <span className="font-medium">{b.batchNumber}</span> — {b.costPerChick !== null ? `KSh ${b.costPerChick.toFixed(2)}` : '—'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TODAY AT A GLANCE ── */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Today at a Glance</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><DollarSign size={13} /> Revenue today</div>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(m.revenueToday)}</p>
                  {m.revenueTrend !== null && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${m.revenueTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {m.revenueTrend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {m.revenueTrend > 0 ? '+' : ''}{m.revenueTrend}% vs yesterday
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><ShoppingCart size={13} /> Orders today</div>
                  <p className="text-xl font-bold text-gray-900">{m.ordersToday}</p>
                  <p className="text-xs text-gray-400 mt-1">{m.ordersPending} pending · {m.ordersOutForDelivery} out for delivery</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Egg size={13} /> Eggs collected</div>
                  <p className="text-xl font-bold text-gray-900">{m.eggsToday.toLocaleString()}</p>
                  {m.eggsDiff !== null && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${m.eggsDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {m.eggsDiff >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {m.eggsDiff > 0 ? '+' : ''}{m.eggsDiff} vs yesterday
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Bird size={13} /> Live bird count</div>
                  <p className="text-xl font-bold text-gray-900">{m.totalBirds.toLocaleString()}</p>
                  {m.mortalityToday > 0
                    ? <p className="text-xs text-red-500 mt-1">{m.mortalityToday} mortality logged today</p>
                    : <p className="text-xs text-gray-400 mt-1">{m.activeBatchCount} active batches</p>
                  }
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Link href="/feed" className={`bg-white rounded-xl border p-4 hover:bg-gray-50 transition ${m.feedIsLow ? 'border-amber-300' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Wheat size={13} /> Feed stock remaining</div>
                  <p className={`text-xl font-bold ${m.feedIsLow ? 'text-amber-600' : 'text-gray-900'}`}>{Math.round(m.feedStock).toLocaleString()} kg</p>
                  {m.feedLowestDays !== null && (
                    <p className={`text-xs mt-1 ${m.feedIsLow ? 'text-amber-600' : 'text-gray-400'}`}>
                      {m.feedIsLow && <AlertTriangle size={11} className="inline mr-1" />}
                      ~{m.feedLowestDays} days left{m.feedIsLow ? ' · reorder soon' : ''}
                    </p>
                  )}
                </Link>
                <Link href="/orders" className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><CreditCard size={13} /> Outstanding payments</div>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(m.outstandingPayments)}</p>
                  <p className="text-xs text-gray-400 mt-1">{m.outstandingCount} order{m.outstandingCount !== 1 ? 's' : ''} awaiting M-Pesa</p>
                </Link>
              </div>
            </div>

            {/* ── EXPENDITURE ALERTS ── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-gray-500" />
                  <h2 className="font-bold text-gray-900">Purchase alerts</h2>
                  {visibleAlerts.length > 0 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">{visibleAlerts.length}</span>}
                </div>
                {isAdmin && dismissedKeys.size > 0 && (
                  <button onClick={() => { setDismissedKeys(new Set()); try { localStorage.removeItem('kpf_dismissed_alerts'); } catch { /* */ } }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline">
                    Restore {dismissedKeys.size} hidden
                  </button>
                )}
              </div>
              {visibleAlerts.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                  {dismissedKeys.size > 0 ? 'All alerts dismissed for today' : 'No purchase actions needed right now'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleAlerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition group">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.type === 'red' ? 'bg-red-500' : alert.type === 'amber' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <Link href={alert.link || '#'}>
                          <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-500">{alert.detail}</p>
                        </Link>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                        <button onClick={() => createFromAlert(alert)}
                          className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium hover:bg-green-200 transition">
                          + Task
                        </button>
                        {isAdmin && (
                          <button onClick={() => dismissAlert(alert)} title="Dismiss for 24 hours"
                            className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── VACCINATION SCHEDULE (informational) ── */}
            {data.vaccinationSchedule && data.vaccinationSchedule.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200">
                <button
                  onClick={() => setVaccOpen((v) => !v)}
                  className="w-full px-5 py-4 flex items-center justify-between border-b border-gray-100 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-2">
                    <Syringe size={16} className="text-purple-500" />
                    <h2 className="font-bold text-gray-900">Vaccination schedule</h2>
                    <span className="text-xs text-gray-400">— informational only</span>
                    {data.vaccinationSchedule.some((b) => b.items.some((i) => i.status === 'overdue')) && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">overdue</span>
                    )}
                    {data.vaccinationSchedule.some((b) => b.items.some((i) => i.status === 'due_soon')) && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">due soon</span>
                    )}
                  </div>
                  {vaccOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </button>

                {vaccOpen && (
                  <div className="divide-y divide-gray-100">
                    {data.vaccinationSchedule.map((batch) => (
                      <div key={batch.batchId} className="px-5 py-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xs font-bold text-gray-700">{batch.batchNumber}</span>
                          <span className="text-xs text-gray-400">{batch.batchType} · Day {batch.ageInDays}</span>
                        </div>
                        <div className="space-y-2">
                          {batch.items.map((item) => {
                            const waText = `Reminder: Purchase ${item.vaccine} vaccine for ${batch.batchNumber} (${batch.batchType}). Due on day ${item.daysOld}${item.daysUntilDue > 0 ? ` — in ${item.daysUntilDue} days` : ' — now'}. Kwamboka Poultry Farm.`;
                            return (
                              <div key={item.vaccine} className="flex items-center gap-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${VACC_STATUS_STYLES[item.status]}`}>
                                  {item.status === 'overdue' ? 'OVERDUE' : item.status === 'due_now' ? 'TODAY' : item.status === 'due_soon' ? `IN ${item.daysUntilDue}D` : item.status === 'done' ? 'DONE' : `DAY ${item.daysOld}`}
                                </span>
                                <span className="text-xs text-gray-700 flex-1">{item.vaccine}</span>
                                <span className="text-[11px] text-gray-400">Administer day {item.daysOld}–{item.windowEnd}</span>
                                <a
                                  href={waLink('0182193380', waText)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Send buy reminder via WhatsApp"
                                  className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-800 px-2 py-1 rounded bg-green-50 hover:bg-green-100 transition flex-shrink-0"
                                >
                                  <Phone size={10} /> Buy reminder
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── KANBAN BOARD ── */}
            <div id="kanban">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Task Board</p>
                <button
                  onClick={() => setShowCreate((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-700 hover:bg-green-800 px-3 py-1.5 rounded-lg transition"
                >
                  <Plus size={13} /> Create task
                </button>
              </div>

              {/* Create task form */}
              {showCreate && (
                <form onSubmit={createTask} className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-3">
                  <p className="text-sm font-bold text-gray-800">New task</p>
                  <input ref={createRef} type="text" placeholder="Task title *"
                    value={newTask.label} onChange={(e) => setNewTask((p) => ({ ...p, label: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <textarea placeholder="Details / notes (optional)" rows={2}
                    value={newTask.detail} onChange={(e) => setNewTask((p) => ({ ...p, detail: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 resize-none text-gray-600" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Priority</label>
                      <select value={newTask.priority} onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))}
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none">
                        <option value="HIGH">🔴 High</option>
                        <option value="MEDIUM">🟡 Medium</option>
                        <option value="LOW">⚪ Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Category</label>
                      <select value={newTask.category} onChange={(e) => setNewTask((p) => ({ ...p, category: e.target.value }))}
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none">
                        <option value="general">General</option>
                        <option value="feed">Feed</option>
                        <option value="eggs">Eggs</option>
                        <option value="vaccination">Vaccination</option>
                        <option value="products">Products</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Deadline</label>
                      <input type="date" value={newTask.deadline} onChange={(e) => setNewTask((p) => ({ ...p, deadline: e.target.value }))}
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Duration</label>
                      <input type="text" placeholder="e.g. 2 hours" value={newTask.duration} onChange={(e) => setNewTask((p) => ({ ...p, duration: e.target.value }))}
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Assign to (WhatsApp number — optional)</label>
                    <input type="tel" placeholder="e.g. 0712 345 678" value={newTask.assignedPhone} onChange={(e) => setNewTask((p) => ({ ...p, assignedPhone: e.target.value }))}
                      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={creating || !newTask.label.trim()}
                      className="flex-1 py-2 text-xs font-bold bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition">
                      {creating ? 'Creating…' : 'Create task'}
                    </button>
                    <button type="button" onClick={() => setShowCreate(false)}
                      className="px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Kanban columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* OPEN */}
                <KanbanColumn title="Open" count={openTasks.length} headerClass="bg-gray-50 border-gray-200"
                  emptyText="No open tasks">
                  {openTasks.map((task) => (
                    <TaskCard key={task.id} task={task}
                      onMove={() => updateStatus(task, 'IN_PROGRESS')} moveLabel="Pick up →"
                      onDelete={() => deleteTask(task.id)} />
                  ))}
                </KanbanColumn>

                {/* IN PROGRESS */}
                <KanbanColumn title="In Progress" count={inProgressTasks.length} headerClass="bg-blue-50 border-blue-200"
                  emptyText="Nothing in progress">
                  {inProgressTasks.map((task) => (
                    <TaskCard key={task.id} task={task}
                      onMove={() => updateStatus(task, 'DONE')} moveLabel="Mark done ✓"
                      onDelete={() => deleteTask(task.id)} moveClass="bg-green-700 text-white hover:bg-green-800" />
                  ))}
                </KanbanColumn>

                {/* DONE */}
                <KanbanColumn title="Done" count={doneTasks.length} headerClass="bg-green-50 border-green-200"
                  emptyText="Nothing done yet">
                  {doneTasks.map((task) => (
                    <TaskCard key={task.id} task={task}
                      onMove={() => updateStatus(task, 'OPEN')} moveLabel="Reopen"
                      onDelete={() => deleteTask(task.id)} dim />
                  ))}
                </KanbanColumn>
              </div>
            </div>

            {/* ── WEEKLY GOALS ── */}
            {data.weeklyGoals && data.weeklyGoals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">This Week&apos;s Goals</p>
                  <Link href="/goals" className="text-xs text-green-700 font-medium hover:text-green-900 flex items-center gap-1">Manage <ArrowRight size={12} /></Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.weeklyGoals.map((goal) => {
                    const pct = goal.progressPct;
                    const barColor = pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
                    const textColor = pct >= 100 ? 'text-green-700' : pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600';
                    const CATEGORY_LABELS: Record<string, string> = { EGG_PRODUCTION: 'Egg Production', REVENUE: 'Revenue', ORDERS: 'Orders', CHICK_COUNT: 'Chick Count', MORTALITY_RATE: 'Mortality Rate', EXPENSES: 'Expenses', FEED_USAGE: 'Feed Usage' };
                    const isCurrency = goal.category === 'REVENUE' || goal.category === 'EXPENSES';
                    const fmt = (v: number) => isCurrency ? formatCurrency(v) : v.toLocaleString();
                    return (
                      <div key={goal.id} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                            <Target size={13} className="text-gray-400" />
                            {goal.label || CATEGORY_LABELS[goal.category] || goal.category}
                          </span>
                          <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                          <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span>{fmt(goal.actual)} <span className="text-gray-400">of</span> {fmt(goal.target)}</span>
                          {goal.daysRemaining > 0 && pct < 100 && <span className={textColor}>need {fmt(goal.neededPace)}/day</span>}
                          {pct >= 100 && <span className="text-green-600 font-medium">On track ✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── RECENT ORDERS + EGGS THIS WEEK ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2"><ShoppingCart size={16} className="text-gray-500" /> Recent orders</h2>
                  <Link href="/orders" className="text-xs text-green-700 font-medium hover:text-green-900 flex items-center gap-1">View all <ArrowRight size={12} /></Link>
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
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2"><Egg size={16} className="text-gray-500" /> Eggs this week</h2>
                  <Link href="/eggs" className="text-xs text-green-700 font-medium flex items-center gap-1">Details <ArrowRight size={12} /></Link>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">Mon–Sun · good eggs only</p>
                    <p className="text-sm font-bold text-gray-900">{data.eggsThisWeek.weekTotal.toLocaleString()} total</p>
                  </div>
                  {data.eggsThisWeek.days.length > 0 ? (
                    <>
                      <div className="flex items-end gap-1.5 mb-3" style={{ height: 80 }}>
                        {data.eggsThisWeek.days.map((d) => {
                          const maxVal = Math.max(...data.eggsThisWeek.days.map((dd) => dd.good), 1);
                          const pct = maxVal > 0 ? (d.good / maxVal) * 100 : 0;
                          return (
                            <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full">
                              {d.good > 0 && <span className={`text-[9px] font-semibold ${d.isToday ? 'text-green-800' : 'text-gray-500'}`}>{d.good}</span>}
                              <div className={`w-full rounded-sm ${d.good === 0 ? 'bg-gray-200' : d.isToday ? 'bg-green-800' : 'bg-green-300'}`} style={{ height: `${d.good > 0 ? Math.max(10, pct) : 4}%` }} />
                              <span className={`text-[10px] leading-none ${d.isToday ? 'font-bold text-green-800' : 'text-gray-400'}`}>{d.isToday ? 'Today' : d.day}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div><p className="text-xs text-gray-500">Daily avg</p><p className="text-lg font-bold text-gray-900">{data.eggsThisWeek.dailyAvg}</p></div>
                        <div className="text-right"><p className="text-xs text-gray-500">Quality rate</p><p className="text-lg font-bold text-green-700">{data.eggsThisWeek.qualityRate}%</p></div>
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center text-gray-400 text-sm">
                      <Egg size={24} className="mx-auto mb-2 text-gray-300" />No egg collections this week.
                      <Link href="/eggs" className="block mt-1 text-green-700 text-xs">Log collection →</Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── FARM STATUS ── */}
            {Object.keys(data.batchesByType).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Farm Status</p>
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><Bird size={16} className="text-gray-500" /> Active batches</h2>
                    <Link href="/batches" className="text-xs text-green-700 font-medium flex items-center gap-1">Manage <ArrowRight size={12} /></Link>
                  </div>
                  {Object.entries(data.batchesByType).map(([type, batches]) => (
                    <div key={type}>
                      <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{type}</p>
                      </div>
                      {batches.map((batch) => (
                        <Link key={batch.id} href={`/batches/${batch.id}`}
                          className="flex items-center justify-between px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{batch.batchNumber} · {batch.type}</p>
                            <p className="text-xs text-gray-500">{batch.currentCount.toLocaleString()} birds · Week {batch.ageWeeks}{batch.breed ? ` · ${batch.breed}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {batch.alerts[0] && <span className="text-xs text-red-600 font-medium">{batch.alerts[0]}</span>}
                            <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">active</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        ) : (
          <div className="p-6"><div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">Failed to load dashboard. Please refresh.</div></div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KanbanColumn({ title, count, headerClass, emptyText, children }: {
  title: string; count: number; headerClass: string; emptyText: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white">
      <div className={`px-4 py-3 border-b flex items-center justify-between ${headerClass}`}>
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</span>
        <span className="text-xs font-bold text-gray-400 bg-white rounded-full px-2 py-0.5 border border-gray-200">{count}</span>
      </div>
      <div className="flex-1 p-3 space-y-2.5 min-h-[120px]">
        {count === 0 && <p className="text-xs text-center text-gray-300 pt-8">{emptyText}</p>}
        {children}
      </div>
    </div>
  );
}

function TaskCard({ task, onMove, moveLabel, onDelete, moveClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200', dim = false }: {
  task: KanbanTask; onMove: () => void; moveLabel: string; onDelete: () => void; moveClass?: string; dim?: boolean;
}) {
  const waUrl = task.assignedPhone
    ? (() => {
        const num = task.assignedPhone.replace(/\D/g, '').replace(/^0/, '254');
        const text = encodeURIComponent(`Hi! You have a task: *${task.label}*${task.detail ? `\n${task.detail}` : ''}${task.deadline ? `\nDeadline: ${new Date(task.deadline).toLocaleDateString('en-KE')}` : ''}${task.duration ? `\nEstimated: ${task.duration}` : ''}\n— Kwamboka Poultry Farm`);
        return `https://wa.me/${num}?text=${text}`;
      })()
    : null;

  const deadlineStr = task.deadline ? new Date(task.deadline).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : null;
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'DONE';

  return (
    <div className={`rounded-lg border border-gray-100 bg-white p-3 shadow-sm group ${dim ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORY_ICONS[task.category || 'general']}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.MEDIUM}`}>
            {task.priority}
          </span>
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition flex-shrink-0">
          <Trash2 size={12} />
        </button>
      </div>
      <p className={`text-sm font-semibold text-gray-900 leading-snug mb-1 ${dim ? 'line-through text-gray-500' : ''}`}>{task.label}</p>
      {task.detail && <p className="text-xs text-gray-400 mb-2 leading-relaxed">{task.detail}</p>}
      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-gray-400">
        {deadlineStr && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
            <Clock size={10} /> {isOverdue ? 'Overdue · ' : ''}{deadlineStr}
          </span>
        )}
        {task.duration && <span>{task.duration}</span>}
        {task.assignedPhone && <span className="flex items-center gap-0.5"><Phone size={10} /> {task.assignedPhone}</span>}
      </div>
      <div className="flex gap-1.5 mt-3">
        <button onClick={onMove} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition ${moveClass}`}>
          {moveLabel}
        </button>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition text-[11px] font-medium">
            <MessageSquare size={11} /> WA
          </a>
        )}
      </div>
    </div>
  );
}
