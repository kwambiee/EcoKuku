'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import {
  Plus, AlertTriangle, Package, Trash2, ShoppingCart,
  BookOpen, ChevronDown, ChevronUp, Info, Wheat, Pencil, X,
} from 'lucide-react';

interface FeedInventory {
  id: string; name: string; supplier?: string; costPerUnit: number;
  totalStock: number; unit: string; dailyAvgConsumption: number;
  daysRemaining: number | null; isCritical: boolean; isLow: boolean;
}

interface FeedLog {
  id: string; feedType: string; recordedDate: string;
  quantityUsed: number; quantityRemaining?: number; notes?: string;
  batch?: { id: string; batchNumber: string } | null;
}

interface FeedPurchaseRecord {
  id: string; date: string; quantity: number; unit: string;
  supplierName: string; supplierContact?: string;
  purchasePrice: number; transportCost: number; totalCost: number;
  receiptRef?: string; notes?: string;
  feedType: { id: string; name: string };
}

interface FeedStats {
  feedCostMonth: number; feedPct: number; totalBirds: number;
  costPerBirdDay: number | null; totalDailyUsage: number;
}

type Action = 'idle' | 'purchase' | 'consume' | 'add_type' | 'edit_log';

function fmtKg(n: number) {
  return n % 1 === 0 ? `${n}` : n.toFixed(2).replace(/\.?0+$/, '');
}

const FEEDING_GUIDE = [
  { age: 'Wk 1–2', feedType: 'Chick starter mash', gPerBird: '15–20g' },
  { age: 'Wk 3–6', feedType: 'Grower mash / pellets', gPerBird: '40–60g' },
  { age: 'Wk 7–16', feedType: 'Layer developer', gPerBird: '80–90g' },
  { age: 'Wk 17–20', feedType: 'Pre-lay / developer', gPerBird: '100–110g' },
  { age: 'Wk 20+', feedType: 'Layer mash', gPerBird: '110–120g' },
  { age: 'Broiler Wk 1–3', feedType: 'Broiler starter', gPerBird: '25–60g' },
  { age: 'Broiler Wk 4–7', feedType: 'Broiler finisher', gPerBird: '80–120g' },
];

const GUIDE_SUPPLEMENTS = 'Supplements: Multivitamins post-vaccination · Grit always available · Electrolytes in heat stress';

function getGuideForAge(days: number) {
  const weeks = days / 7;
  if (weeks < 2) return FEEDING_GUIDE[0];
  if (weeks < 6) return FEEDING_GUIDE[1];
  if (weeks < 16) return FEEDING_GUIDE[2];
  if (weeks < 20) return FEEDING_GUIDE[3];
  return FEEDING_GUIDE[4];
}

export default function FeedPage() {
  const [inventory, setInventory] = useState<FeedInventory[]>([]);
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [purchases, setPurchases] = useState<FeedPurchaseRecord[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [batches, setBatches] = useState<{ id: string; batchNumber: string; startDate: string; ageAtArrival?: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<Action>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedingGuide, setShowFeedingGuide] = useState(false);
  const [editingLog, setEditingLog] = useState<FeedLog | null>(null);
  const [editLogForm, setEditLogForm] = useState({
    feedTypeName: '', quantityUsed: '', batchId: '', notes: '', date: '',
  });

  const [purchaseForm, setPurchaseForm] = useState({
    feedTypeId: '', date: new Date().toISOString().split('T')[0], quantity: '',
    supplierName: '', supplierContact: '', purchasePrice: '', transportCost: '',
    receiptRef: '', notes: '',
  });
  const [consumeForm, setConsumeForm] = useState({ feedTypeName: '', quantityUsed: '', batchId: '', notes: '', date: new Date().toISOString().split('T')[0] });
  const [addTypeForm, setAddTypeForm] = useState({ name: '', supplier: '', cost: '' });

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [feedRes, batchRes] = await Promise.all([
        fetch('/api/feed'),
        fetch('/api/batches?status=ACTIVE&limit=50'),
      ]);
      const feedData = await feedRes.json();
      const batchData = await batchRes.json();
      setInventory(feedData.inventory || []);
      setLogs(feedData.recentLogs || []);
      setPurchases(feedData.recentPurchases || []);
      setStats(feedData.stats || null);
      setBatches(batchData.data || []);
    } catch { toast.error('Failed to load feed data'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', ...purchaseForm }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to record purchase'); }
      toast.success('Purchase recorded — stock updated and expense logged');
      setPurchaseForm({
        feedTypeId: '', date: new Date().toISOString().split('T')[0], quantity: '',
        supplierName: '', supplierContact: '', purchasePrice: '', transportCost: '',
        receiptRef: '', notes: '',
      });
      setAction('idle');
      fetchAll();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSaving(false); }
  };

  const handleConsume = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_consumption', ...consumeForm }),
      });
      if (!res.ok) throw new Error('Failed to log');
      toast.success('Consumption logged and stock deducted');
      setConsumeForm({ feedTypeName: '', quantityUsed: '', batchId: '', notes: '', date: new Date().toISOString().split('T')[0] });
      setAction('idle');
      fetchAll();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSaving(false); }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_type', ...addTypeForm }),
      });
      if (!res.ok) throw new Error('Failed to add');
      toast.success(`Feed type "${addTypeForm.name}" added`);
      setAddTypeForm({ name: '', supplier: '', cost: '' });
      setAction('idle');
      fetchAll();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSaving(false); }
  };

  const openEditLog = (log: FeedLog) => {
    setEditingLog(log);
    setEditLogForm({
      feedTypeName: log.feedType,
      quantityUsed: String(log.quantityUsed),
      batchId: log.batch?.id || '',
      notes: log.notes || '',
      date: new Date(log.recordedDate).toISOString().split('T')[0],
    });
    setAction('edit_log');
  };

  const handleEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: editingLog.id, ...editLogForm }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update');
      toast.success('Log updated');
      setAction('idle');
      setEditingLog(null);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLog = (log: FeedLog) => {
    toast(`Delete ${fmtKg(log.quantityUsed)} kg of ${log.feedType}?`, {
      description: 'This will restore the consumed quantity back to stock.',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const res = await fetch('/api/feed', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ logId: log.id }),
            });
            if (!res.ok) throw new Error();
            toast.success('Entry deleted — stock restored');
            fetchAll();
          } catch {
            toast.error('Failed to delete');
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const deleteFeedType = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? All stock and log records will be removed.`)) return;
    await fetch('/api/feed', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedTypeId: id }),
    });
    toast.success(`${name} removed`);
    fetchAll();
  };

  const criticalItems = inventory.filter((f) => f.isCritical);
  const warningItems = inventory.filter((f) => f.isLow && !f.isCritical);
  const worstItem = [...criticalItems, ...warningItems][0];
  const computedTotal = (parseFloat(purchaseForm.purchasePrice) || 0) + (parseFloat(purchaseForm.transportCost) || 0);

  const selectedBatch = batches.find((b) => b.id === consumeForm.batchId);
  const batchAgeDays = selectedBatch
    ? Math.floor((Date.now() - new Date(selectedBatch.startDate).getTime()) / 86400000) + (selectedBatch.ageAtArrival || 0)
    : null;
  const batchAgeWeeks = batchAgeDays !== null ? Math.floor(batchAgeDays / 7) : null;
  const batchGuide = batchAgeDays !== null ? getGuideForAge(batchAgeDays) : null;

  const s = stats;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wheat size={24} className="text-green-800" />
              <h1 className="text-2xl font-bold">Feed Management</h1>
            </div>
            <p className="text-gray-500 text-sm mt-1">Stock levels, purchases, daily consumption and feeding guide by age</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAction('consume')}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Plus size={15} /> Log consumption
            </button>
            <button onClick={async () => { await fetchAll(); setAction('purchase'); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <ShoppingCart size={15} /> Record purchase
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Critical / Warning Alert Banner */}
          {worstItem && (
            <div className={`rounded-lg p-4 flex items-center justify-between ${worstItem.isCritical ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className={worstItem.isCritical ? 'text-red-600' : 'text-amber-600'} />
                <div>
                  <span className={`font-semibold ${worstItem.isCritical ? 'text-red-900' : 'text-amber-900'}`}>
                    {worstItem.name} {worstItem.isCritical ? 'critically low' : 'running low'} — {worstItem.totalStock.toFixed(0)} kg remaining (~{worstItem.daysRemaining} days).
                  </span>
                  <span className={`text-sm ml-1 ${worstItem.isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                    {worstItem.dailyAvgConsumption > 0 && `Based on ${worstItem.dailyAvgConsumption} kg/day consumption.`}
                    {worstItem.supplier && ` Reorder from ${worstItem.supplier}.`}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => { await fetchAll(); setAction('purchase'); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border whitespace-nowrap ${worstItem.isCritical ? 'border-red-300 text-red-800 hover:bg-red-100' : 'border-amber-300 text-amber-800 hover:bg-amber-100'}`}
              >
                Record purchase →
              </button>
            </div>
          )}

          {/* Summary Cards — per feed type stock + cost cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {inventory.map((f) => (
              <div key={f.id} className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 font-medium">{f.name} stock</p>
                <p className={`text-2xl font-bold mt-1 ${f.isCritical ? 'text-red-600' : f.isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                  {f.totalStock.toFixed(0)} kg
                </p>
                <p className={`text-xs mt-0.5 ${f.isCritical ? 'text-red-500' : f.isLow ? 'text-amber-500' : 'text-green-600'}`}>
                  {f.daysRemaining !== null
                    ? f.isCritical
                      ? `⚠ ~${f.daysRemaining} days — REORDER NOW`
                      : f.isLow
                        ? `⚠ ~${f.daysRemaining} days — reorder soon`
                        : `✓ ~${f.daysRemaining} days — OK`
                    : f.totalStock === 0 ? '✗ Out of stock' : '—'}
                </p>
              </div>
            ))}
            {/* Feed cost this month */}
            {s && (
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 font-medium">Feed cost this month</p>
                <p className="text-2xl font-bold mt-1">KSh {s.feedCostMonth.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.feedPct > 0 ? `${s.feedPct}% of total expenses` : 'No expenses recorded'}
                </p>
              </div>
            )}
            {/* Cost per bird per day */}
            {s && (
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 font-medium">Cost per bird per day</p>
                <p className="text-2xl font-bold mt-1">
                  {s.costPerBirdDay !== null ? `KSh ${s.costPerBirdDay.toFixed(1)}` : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.totalBirds > 0 ? `${s.totalBirds.toLocaleString()} birds combined` : 'No active batches'}
                </p>
              </div>
            )}
          </div>

          {/* Two-column: Purchase Records + Feeding Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Purchase Records */}
            <div className="lg:col-span-3 bg-white rounded-xl border">
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="font-bold text-lg">Purchase records</h2>
                <button onClick={async () => { await fetchAll(); setAction('purchase'); }}
                  className="text-sm text-green-700 font-medium hover:underline flex items-center gap-1">
                  <Plus size={14} /> New purchase
                </button>
              </div>
              {purchases.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No purchases recorded yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Feed type</th>
                        <th className="px-4 py-3 text-right">Bags</th>
                        <th className="px-4 py-3 text-left">Supplier</th>
                        <th className="px-4 py-3 text-right">Price/bag</th>
                        <th className="px-4 py-3 text-right">Transport</th>
                        <th className="px-4 py-3 text-right font-bold">Total cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {purchases.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{new Date(p.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                          <td className="px-4 py-3 text-sm font-medium">{p.feedType.name}</td>
                          <td className="px-4 py-3 text-right text-sm">{Number(p.quantity).toFixed(0)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="text-gray-800">{p.supplierName}</span>
                            {p.supplierContact && <span className="block text-[11px] text-gray-400">{p.supplierContact}</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">KSh {Number(p.purchasePrice).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-500">
                            {Number(p.transportCost) > 0 ? `KSh ${Number(p.transportCost).toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold">KSh {Number(p.totalCost).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Feeding Guide */}
            <div className="lg:col-span-2 bg-white rounded-xl border">
              <div className="p-5 border-b flex items-center gap-2">
                <BookOpen size={18} className="text-green-800" />
                <h2 className="font-bold text-lg">Feeding guide by age</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-green-50 text-xs uppercase text-green-900">
                    <tr>
                      <th className="px-4 py-3 text-left">Age</th>
                      <th className="px-4 py-3 text-left">Feed type</th>
                      <th className="px-4 py-3 text-right">g/bird/day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {FEEDING_GUIDE.map((row, i) => (
                      <tr key={i} className="hover:bg-green-50/50">
                        <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{row.age}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-700">{row.feedType}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-medium text-gray-800">{row.gPerBird}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t bg-green-50/30 text-xs text-gray-500">
                {GUIDE_SUPPLEMENTS}
              </div>
            </div>
          </div>

          {/* Daily Consumption Log */}
          <div className="bg-white rounded-xl border">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Daily consumption log</h2>
              <button onClick={() => setAction('consume')}
                className="text-sm text-green-700 font-medium hover:underline flex items-center gap-1">
                <Plus size={14} /> Log today
              </button>
            </div>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No consumption logged yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Batch</th>
                      <th className="px-4 py-3 text-left">Feed type</th>
                      <th className="px-4 py-3 text-right">Given (kg)</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.slice(0, 20).map((log) => {
                      const isWarning = log.notes && /reduc|refus|low|poor|weak|monitor/i.test(log.notes);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 group">
                          <td className="px-4 py-3 text-sm">{new Date(log.recordedDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                          <td className="px-4 py-3 text-sm font-medium">{log.batch?.batchNumber || '—'}</td>
                          <td className="px-4 py-3 text-sm">{log.feedType}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold">{fmtKg(Number(log.quantityUsed))} kg</td>
                          <td className="px-4 py-3 text-sm">
                            {log.notes ? (
                              <span className={isWarning ? 'text-amber-600 font-medium' : 'text-gray-500'}>
                                {log.notes}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditLog(log)} title="Edit"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => deleteLog(log)} title="Delete"
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                <Trash2 size={13} />
                              </button>
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

          {/* Feed Stock Levels — detailed table */}
          <div className="bg-white rounded-xl border">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Feed stock levels</h2>
              <button onClick={() => setAction('add_type')}
                className="text-sm text-green-700 font-medium hover:underline flex items-center gap-1">
                <Plus size={14} /> Add feed type
              </button>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : inventory.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Package size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No feed types added yet.</p>
                <p className="text-sm mt-1">Add feed types (Layer Mash, Starter Crumb, etc.) to start tracking stock.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Feed type</th>
                      <th className="px-4 py-3 text-left">Supplier</th>
                      <th className="px-4 py-3 text-right">Current stock</th>
                      <th className="px-4 py-3 text-right">Daily usage</th>
                      <th className="px-4 py-3 text-right">Days left</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.map((f) => (
                      <tr key={f.id} className={`hover:bg-gray-50 ${f.isCritical ? 'bg-red-50/30' : f.isLow ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-sm text-gray-900">{f.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{f.supplier || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-sm">
                          <span className={f.isCritical ? 'text-red-700' : f.isLow ? 'text-amber-700' : 'text-gray-900'}>
                            {f.totalStock.toFixed(1)} {f.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {f.dailyAvgConsumption > 0 ? `${f.dailyAvgConsumption} ${f.unit}/day` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {f.daysRemaining !== null ? (
                            <span className={f.isCritical ? 'text-red-700 font-bold' : f.isLow ? 'text-amber-700 font-bold' : 'text-gray-700'}>
                              ~{f.daysRemaining} days
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.isCritical ? 'bg-red-100 text-red-700' : f.totalStock === 0 ? 'bg-red-100 text-red-700' : f.isLow ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {f.totalStock === 0 ? 'Out of Stock' : f.isCritical ? 'Critical' : f.isLow ? 'Low' : 'OK'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deleteFeedType(f.id, f.name)} className="p-1 text-red-400 hover:text-red-600" title="Delete feed type">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stock Alert Thresholds Info */}
          <div className="bg-white rounded-xl border">
            <button
              onClick={() => setShowFeedingGuide(!showFeedingGuide)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info size={16} className="text-gray-400" />
                <span className="font-medium text-sm text-gray-700">Stock alert thresholds</span>
              </div>
              {showFeedingGuide ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {showFeedingGuide && (
              <div className="border-t px-5 py-4 space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-gray-700">Critical alert (red)</span>
                  </div>
                  <span className="text-gray-500 font-medium">≤ 3 days remaining</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-gray-700">Warning alert (amber)</span>
                  </div>
                  <span className="text-gray-500 font-medium">≤ 7 days remaining</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-300" />
                    <span className="text-gray-700">Days remaining calc</span>
                  </div>
                  <span className="text-gray-500 font-medium">Stock ÷ avg daily use</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ADD FEED TYPE MODAL */}
        {action === 'add_type' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-xl">Add Feed Type</h2>
                <button onClick={() => setAction('idle')} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleAddType} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Feed Name *</label>
                  <input type="text" required value={addTypeForm.name}
                    onChange={(e) => setAddTypeForm({ ...addTypeForm, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Layer Mash, Starter Crumb, Grower Pellets" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier</label>
                    <input type="text" value={addTypeForm.supplier}
                      onChange={(e) => setAddTypeForm({ ...addTypeForm, supplier: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Unga Farm Care" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cost per bag (KSh)</label>
                    <input type="number" step="0.01" value={addTypeForm.cost}
                      onChange={(e) => setAddTypeForm({ ...addTypeForm, cost: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSaving ? 'Adding...' : 'Add Feed Type'}
                  </button>
                  <button type="button" onClick={() => setAction('idle')}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RECORD PURCHASE MODAL */}
        {action === 'purchase' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between sticky top-0 bg-white rounded-t-xl">
                <h2 className="font-bold text-xl">Record Feed Purchase</h2>
                <button onClick={() => setAction('idle')} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handlePurchase} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={purchaseForm.date}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Feed Type *</label>
                    <select required value={purchaseForm.feedTypeId}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, feedTypeId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select feed type...</option>
                      {inventory.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    {inventory.length === 0 && <p className="text-xs text-amber-600 mt-1">Add feed types first using &quot;Add feed type&quot;.</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity (kg) *</label>
                  <input type="number" step="0.1" required value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 200" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier Name *</label>
                    <input type="text" required value={purchaseForm.supplierName}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Unga Farm Care" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone / Contact</label>
                    <input type="text" value={purchaseForm.supplierContact}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierContact: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0722 111 222" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Price (KSh) *</label>
                    <input type="number" step="0.01" required value={purchaseForm.purchasePrice}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasePrice: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 4500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Transport (KSh)</label>
                    <input type="number" step="0.01" value={purchaseForm.transportCost}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, transportCost: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total Cost</span>
                  <span className="text-lg font-bold text-green-800">KSh {computedTotal.toLocaleString()}</span>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Receipt / Invoice Ref</label>
                  <input type="text" value={purchaseForm.receiptRef}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, receiptRef: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Receipt number" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea value={purchaseForm.notes}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
                    placeholder="Any notes about this purchase..." />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Record Purchase'}
                  </button>
                  <button type="button" onClick={() => setAction('idle')}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LOG CONSUMPTION MODAL */}
        {action === 'consume' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between">
                <h2 className="font-bold text-xl">Log Feed Consumption</h2>
                <button onClick={() => setAction('idle')} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleConsume} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={consumeForm.date}
                      onChange={(e) => setConsumeForm({ ...consumeForm, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Batch</label>
                    <select value={consumeForm.batchId} onChange={(e) => setConsumeForm({ ...consumeForm, batchId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">All batches / general</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Feed Type *</label>
                    <select required value={consumeForm.feedTypeName} onChange={(e) => setConsumeForm({ ...consumeForm, feedTypeName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select...</option>
                      {inventory.map((f) => <option key={f.id} value={f.name}>{f.name} ({f.totalStock.toFixed(0)} kg)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Given (kg) *</label>
                    <input type="number" step="0.1" required value={consumeForm.quantityUsed}
                      onChange={(e) => setConsumeForm({ ...consumeForm, quantityUsed: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 38" />
                  </div>
                </div>

                {batchGuide && batchAgeDays !== null && batchAgeWeeks !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Batch is <strong>~{batchAgeWeeks} weeks</strong> old.
                      Recommended: <strong>{batchGuide.gPerBird}</strong>/bird/day of <strong>{batchGuide.feedType}</strong>.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes on appetite</label>
                  <input type="text" value={consumeForm.notes}
                    onChange={(e) => setConsumeForm({ ...consumeForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Normal appetite, Slightly reduced — monitor" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Log Consumption'}
                  </button>
                  <button type="button" onClick={() => setAction('idle')}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT LOG MODAL */}
        {action === 'edit_log' && editingLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold text-xl">Edit Consumption Log</h2>
                <button onClick={() => { setAction('idle'); setEditingLog(null); }}
                  className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditLog} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={editLogForm.date}
                      onChange={(e) => setEditLogForm({ ...editLogForm, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Batch</label>
                    <select value={editLogForm.batchId}
                      onChange={(e) => setEditLogForm({ ...editLogForm, batchId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">All batches / general</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Feed Type *</label>
                    <select required value={editLogForm.feedTypeName}
                      onChange={(e) => setEditLogForm({ ...editLogForm, feedTypeName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select...</option>
                      {inventory.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Given (kg) *</label>
                    <input type="number" step="0.1" required value={editLogForm.quantityUsed}
                      onChange={(e) => setEditLogForm({ ...editLogForm, quantityUsed: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 38" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes on appetite</label>
                  <input type="text" value={editLogForm.notes}
                    onChange={(e) => setEditLogForm({ ...editLogForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Normal appetite, Slightly reduced — monitor" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => { setAction('idle'); setEditingLog(null); }}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
