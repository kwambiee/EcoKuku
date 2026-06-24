'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Badge, formatCurrency } from '@ecokuku/ui';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, X, Egg, TrendingUp, TrendingDown, AlertTriangle, ArrowUpDown, Filter } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface EggProduction {
  id: string; date: string; collected: number; broken?: number; cracked?: number;
  eggSize?: string; collectionTime?: string; collectedBy?: string;
  storageLocation?: string; notes?: string;
  batch?: { id: string; batchNumber: string };
}

interface Stats {
  todayCollected: number; todayBroken: number; yesterdayCollected: number;
  eggsDiff: number | null; dailyAvg7d: number; qualityRate: string;
  weekTrend: number | null; trendAlert: boolean;
  layingRate: string | null; totalLayers: number;
  eggsInStore: number; totalProduced: number; totalSold: number;
  monthCollected: number;
}

interface Batch { id: string; batchNumber: string; }

type SortKey = 'date' | 'collected' | 'batch' | 'eggSize';
type SortDir = 'asc' | 'desc';

const SIZE_GRADES = ['Jumbo', 'Large', 'Medium', 'Small'];
const COLLECTION_ROUNDS = ['Morning', 'Afternoon', 'Evening'];
const SIZE_COLORS: Record<string, string> = {
  Jumbo: 'bg-purple-100 text-purple-800', Large: 'bg-blue-100 text-blue-800',
  Medium: 'bg-green-100 text-green-800', Small: 'bg-yellow-100 text-yellow-800',
};

export default function EggsPage() {
  const [eggs, setEggs] = useState<EggProduction[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dailyChart, setDailyChart] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEgg, setSelectedEgg] = useState<EggProduction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [batchFilter, setBatchFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showCharts, setShowCharts] = useState(true);

  const emptyForm = {
    date: new Date().toISOString().split('T')[0], collected: '', broken: '', cracked: '',
    eggSize: '', collectionTime: 'Morning', collectedBy: '', storageLocation: '', notes: '', batchId: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [editData, setEditData] = useState(emptyForm);

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const weekSparkData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dow = today.getDay();
    const mondayOffset = dow === 0 ? 6 : dow - 1;
    const monday = new Date(today.getTime() - mondayOffset * 86400000);

    const days = DAY_NAMES.map((name, i) => {
      const date = new Date(monday.getTime() + i * 86400000);
      const dateStr = toLocalDateStr(date);
      const dayRecords = eggs.filter((e) => e.date.substring(0, 10) === dateStr);
      const collected = dayRecords.reduce((s, e) => s + e.collected, 0);
      const damaged = dayRecords.reduce((s, e) => s + (e.broken || 0) + (e.cracked || 0), 0);
      const isToday = date.getTime() === today.getTime();
      const isFuture = date.getTime() > today.getTime();
      return { day: name, good: collected - damaged, bad: damaged, isToday, isFuture };
    });
    return days;
  }, [eggs]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (batchFilter) params.set('batchId', batchFilter);
      const [eggsRes, batchRes] = await Promise.all([
        fetch(`/api/eggs?${params}`),
        fetch('/api/batches?status=ACTIVE&limit=100'),
      ]);
      const eggsData = await eggsRes.json();
      const batchData = await batchRes.json();
      setEggs(eggsData.data || []);
      setStats(eggsData.stats || null);
      setDailyChart(eggsData.charts?.daily || []);
      setBatches((batchData.data || []).map((b: any) => ({ id: b.id, batchNumber: b.batchNumber })));
    } catch {
      toast.error('Failed to load egg data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [batchFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/eggs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Egg collection logged');
      setFormData(emptyForm);
      setShowForm(false);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEgg) return;
    try {
      const res = await fetch('/api/eggs', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eggProductionId: selectedEgg.id, ...editData }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Record updated');
      setShowEditModal(false);
      fetchAll();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/eggs', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eggProductionId: id }),
      });
      toast.success('Record deleted');
      fetchAll();
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (rec: EggProduction) => {
    setSelectedEgg(rec);
    setEditData({
      date: rec.date.split('T')[0], collected: String(rec.collected),
      broken: String(rec.broken || 0), cracked: String(rec.cracked || 0),
      eggSize: rec.eggSize || '', collectionTime: rec.collectionTime || 'Morning',
      collectedBy: rec.collectedBy || '', storageLocation: rec.storageLocation || '',
      notes: rec.notes || '', batchId: rec.batch?.id || '',
    });
    setShowEditModal(true);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...eggs].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'date': cmp = new Date(a.date).getTime() - new Date(b.date).getTime(); break;
      case 'collected': cmp = a.collected - b.collected; break;
      case 'batch': cmp = (a.batch?.batchNumber || '').localeCompare(b.batch?.batchNumber || ''); break;
      case 'eggSize': cmp = (a.eggSize || '').localeCompare(b.eggSize || ''); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const s = stats;
  const fmt = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

  const SortTh = ({ label, field, className }: { label: string; field: SortKey; className?: string }) => (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 select-none ${className || ''}`}
      onClick={() => handleSort(field)}>
      <span className="inline-flex items-center gap-1">{label}
        <ArrowUpDown size={10} className={sortKey === field ? 'text-green-700' : 'text-gray-300'} />
      </span>
    </th>
  );

  const FormFields = ({ data, setData }: { data: typeof emptyForm; setData: (d: typeof emptyForm) => void }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
          <input type="date" required value={data.date} onChange={(e) => setData({ ...data, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Batch</label>
          <select value={data.batchId} onChange={(e) => setData({ ...data, batchId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">All / No batch</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber}</option>)}
          </select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Collection Round</label>
          <select value={data.collectionTime} onChange={(e) => setData({ ...data, collectionTime: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            {COLLECTION_ROUNDS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select></div>
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Eggs Collected *</label>
          <input type="number" required min="0" value={data.collected} onChange={(e) => setData({ ...data, collected: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Broken</label>
          <input type="number" min="0" value={data.broken} onChange={(e) => setData({ ...data, broken: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Cracked</label>
          <input type="number" min="0" value={data.cracked} onChange={(e) => setData({ ...data, cracked: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Size Grade</label>
          <select value={data.eggSize} onChange={(e) => setData({ ...data, eggSize: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">—</option>
            {SIZE_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Collected By</label>
          <input type="text" value={data.collectedBy} onChange={(e) => setData({ ...data, collectedBy: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Staff name" /></div>
        <div><label className="block text-sm font-semibold text-gray-700 mb-1">Storage Location</label>
          <input type="text" value={data.storageLocation} onChange={(e) => setData({ ...data, storageLocation: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Cold room A" /></div>
      </div>
      <div><label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
        <textarea rows={2} value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Any observations..." /></div>
    </div>
  );

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Egg size={28} className="text-green-700" />
            <div>
              <h1 className="text-2xl font-bold">Egg Production</h1>
              <p className="text-gray-500 text-sm">Daily collection logs and production trends</p>
            </div>
          </div>
          <button onClick={() => { setFormData(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 text-sm">
            <Plus size={16} /> Log Collection
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary Cards */}
          {s && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-xs text-gray-500">Collected today</p>
                  <p className="text-2xl font-bold text-gray-900">{s.todayCollected.toLocaleString()}</p>
                  {s.eggsDiff !== null && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${s.eggsDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {s.eggsDiff >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {s.eggsDiff > 0 ? '+' : ''}{s.eggsDiff} vs yesterday
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-xs text-gray-500">Laying rate</p>
                  <p className={`text-2xl font-bold ${s.layingRate && parseFloat(s.layingRate) < 60 ? 'text-red-600' : 'text-green-700'}`}>
                    {s.layingRate ? `${s.layingRate}%` : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{s.totalLayers.toLocaleString()} layers active</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-xs text-gray-500">Quality rate</p>
                  <p className="text-2xl font-bold text-green-700">{s.qualityRate}%</p>
                  <p className="text-xs text-gray-400 mt-1">Good eggs / total</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-xs text-gray-500">Broken + cracked today</p>
                  <p className={`text-2xl font-bold ${s.todayBroken > 0 ? 'text-red-600' : 'text-gray-900'}`}>{s.todayBroken.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {s.todayCollected > 0 ? `${((s.todayBroken / s.todayCollected) * 100).toFixed(1)}% of today's collection` : 'No collections today'}
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-xs text-gray-500">In store (unsold)</p>
                  <p className="text-2xl font-bold text-gray-900">{s.eggsInStore.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {s.totalProduced.toLocaleString()} produced · {s.totalSold.toLocaleString()} sold
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-xs text-gray-500">7-day avg / day</p>
                  <p className="text-2xl font-bold text-gray-900">{s.dailyAvg7d.toLocaleString()}</p>
                  {s.weekTrend !== null && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${s.weekTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {s.weekTrend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {s.weekTrend > 0 ? '+' : ''}{s.weekTrend}% vs prior week
                    </p>
                  )}
                </div>
              </div>

              {/* Trend Alert */}
              {s.trendAlert && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900">Production drop alert</p>
                    <p className="text-sm text-red-700">Collection is down {Math.abs(s.weekTrend!)}% compared to the prior week. Check feed quality, water, lighting, and flock health.</p>
                  </div>
                </div>
              )}

              {/* Laying rate warning */}
              {s.layingRate && parseFloat(s.layingRate) < 60 && parseFloat(s.layingRate) > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-900">Low laying rate: {s.layingRate}%</p>
                    <p className="text-sm text-amber-700">Below 60% indicates possible health or nutrition problems. Check feed calcium levels, lighting hours, and stress factors.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Charts */}
          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Line Chart — 30 day trend */}
              {dailyChart.length > 1 && (
                <div className="bg-white rounded-xl border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm">Egg production trend</h3>
                      <p className="text-xs text-gray-400">Last 30 days</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-3 h-1 rounded bg-gray-800 inline-block" /> Total</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-3 h-1 rounded bg-green-500 inline-block" /> Good</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-3 h-1 rounded bg-red-400 inline-block" /> Bad</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                        formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                      />
                      <Line type="monotone" dataKey="collected" name="Total collected" stroke="#1f2937" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="good" name="Good eggs" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="damaged" name="Broken + cracked" stroke="#f87171" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Bar Chart — This week daily breakdown */}
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm">This week</h3>
                    <p className="text-xs text-gray-400">Daily good vs broken eggs (Mon–Sun)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Good</span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-600"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Bad</span>
                  </div>
                </div>
                {weekSparkData.some((d) => d.good > 0 || d.bad > 0) ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={weekSparkData} barGap={2} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val: string, i: number) => weekSparkData[i]?.isToday ? `${val} ★` : val}
                        />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                          formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                        />
                        <Bar dataKey="good" name="Good eggs" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="bad" name="Broken + cracked" fill="#f87171" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-between pt-3 mt-2 border-t text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Good total</p>
                        <p className="font-bold text-green-700">{weekSparkData.reduce((ss, d) => ss + d.good, 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Broken total</p>
                        <p className="font-bold text-red-500">{weekSparkData.reduce((ss, d) => ss + d.bad, 0).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Daily avg</p>
                        <p className="font-bold">{s ? s.dailyAvg7d.toLocaleString() : '—'}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-gray-400 text-sm">No egg collections logged this week</div>
                )}
              </div>
            </div>
          )}

          {/* Collection History Table */}
          <div className="bg-white rounded-xl border">
            <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-bold text-lg">Collection history</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-gray-400" />
                  <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm">
                    <option value="">All batches</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber}</option>)}
                  </select>
                </div>
                <button onClick={() => setShowCharts(!showCharts)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline">
                  {showCharts ? 'Hide charts' : 'Show charts'}
                </button>
              </div>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : sorted.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Egg size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No egg records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <SortTh label="Date" field="date" />
                      <SortTh label="Batch" field="batch" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Round</th>
                      <SortTh label="Collected" field="collected" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Broken</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Good eggs</th>
                      <SortTh label="Grade" field="eggSize" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sorted.map((rec) => {
                      const damaged = (rec.broken || 0) + (rec.cracked || 0);
                      const good = rec.collected - damaged;
                      const dateStr = new Date(rec.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
                      return (
                        <tr key={rec.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            <span>{dateStr}</span>
                            {rec.collectionTime && <span className="block text-xs text-gray-400">{rec.collectionTime === 'Morning' ? 'AM' : rec.collectionTime === 'Afternoon' ? 'PM' : 'Eve'}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{rec.batch?.batchNumber || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{rec.collectionTime || '—'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-700">{rec.collected.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600">{damaged > 0 ? damaged : '—'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{good.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            {rec.eggSize ? (
                              <Badge className={`text-xs ${SIZE_COLORS[rec.eggSize] || 'bg-gray-100 text-gray-700'}`}>{rec.eggSize}</Badge>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{rec.collectedBy || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(rec)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={14} /></button>
                              <button onClick={() => handleDelete(rec.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* LOG COLLECTION MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between sticky top-0 bg-white z-10">
                <h2 className="font-bold text-xl">Log Egg Collection</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-5">
                <FormFields data={formData} setData={setFormData} />
                <div className="flex gap-3 mt-5">
                  <button type="submit" className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700">Log Collection</button>
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {showEditModal && selectedEgg && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between sticky top-0 bg-white z-10">
                <h2 className="font-bold text-xl">Edit Collection Record</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdate} className="p-5">
                <FormFields data={editData} setData={setEditData} />
                <div className="flex gap-3 mt-5">
                  <button type="submit" className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700">Update</button>
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
