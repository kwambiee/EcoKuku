'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import {
  Plus, AlertTriangle, Package, Trash2, ShoppingCart,
  BookOpen, Info, Wheat, ChevronUp, ChevronDown,
} from 'lucide-react';

interface FeedInventory {
  id: string; name: string; supplier?: string; costPerUnit: number;
  totalStock: number; unit: string; dailyAvgConsumption: number;
  daysRemaining: number | null; isCritical: boolean; isLow: boolean;
}

interface FeedPurchaseRecord {
  id: string; date: string; quantity: number; unit: string;
  numberOfBags?: number; bagSizeKg?: number;
  supplierName: string; supplierContact?: string;
  purchasePrice: number; transportCost: number; totalCost: number;
  receiptRef?: string; notes?: string;
  feedType: { id: string; name: string };
}

interface FeedStats {
  feedCostMonth: number; feedPct: number; totalBirds: number;
  costPerBirdDay: number | null; totalDailyUsage: number;
}

type Action = 'idle' | 'purchase' | 'add_type';

// Per-week feeding data from the vet-recommended guide photo
// gPerBird = grams per bird per day
const FEEDING_GUIDE: { week: number; ageRange: string; phase: string; phaseColor: string; gPerBird: number }[] = [
  // Starter Crumbs — Week 1–5
  { week: 1,  ageRange: '1–7 days',     phase: 'Starter Crumbs',  phaseColor: 'green',  gPerBird: 13 },
  { week: 2,  ageRange: '8–14 days',    phase: 'Starter Crumbs',  phaseColor: 'green',  gPerBird: 23 },
  { week: 3,  ageRange: '15–21 days',   phase: 'Starter Crumbs',  phaseColor: 'green',  gPerBird: 28 },
  { week: 4,  ageRange: '22–28 days',   phase: 'Starter Crumbs',  phaseColor: 'green',  gPerBird: 33 },
  { week: 5,  ageRange: '29–35 days',   phase: 'Starter Crumbs',  phaseColor: 'green',  gPerBird: 38 },
  // Growers Mash — Week 6–15
  { week: 6,  ageRange: '36–42 days',   phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 43 },
  { week: 7,  ageRange: '43–49 days',   phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 48 },
  { week: 8,  ageRange: '50–56 days',   phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 53 },
  { week: 9,  ageRange: '57–63 days',   phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 58 },
  { week: 10, ageRange: '64–70 days',   phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 63 },
  { week: 11, ageRange: '71–77 days',   phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 68 },
  { week: 12, ageRange: '78–84 days',   phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 73 },
  { week: 13, ageRange: '85–91 days',   phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 78 },
  { week: 14, ageRange: '92–98 days',   phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 83 },
  { week: 15, ageRange: '99–105 days',  phase: 'Growers Mash',    phaseColor: 'orange', gPerBird: 88 },
  // Layers Mash — Week 16–20+
  { week: 16, ageRange: '106–112 days', phase: 'Layers Mash',     phaseColor: 'blue',   gPerBird: 93 },
  { week: 17, ageRange: '113–119 days', phase: 'Layers Mash',     phaseColor: 'blue',   gPerBird: 98 },
  { week: 18, ageRange: '120–126 days', phase: 'Layers Mash',     phaseColor: 'blue',   gPerBird: 103 },
  { week: 19, ageRange: '127–133 days', phase: 'Layers Mash',     phaseColor: 'blue',   gPerBird: 108 },
  { week: 20, ageRange: '134+ days',    phase: 'Layers Mash',     phaseColor: 'blue',   gPerBird: 113 },
];

export default function FeedPage() {
  const [inventory, setInventory] = useState<FeedInventory[]>([]);
  const [purchases, setPurchases] = useState<FeedPurchaseRecord[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<Action>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedingGuide, setShowFeedingGuide] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({
    feedTypeId: '', date: new Date().toISOString().split('T')[0],
    numberOfBags: '', bagSizeKg: '70',
    supplierName: '', supplierContact: '', purchasePrice: '', transportCost: '',
    receiptRef: '', notes: '',
  });
  const [addTypeForm, setAddTypeForm] = useState({ name: '', supplier: '', cost: '' });

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/feed');
      const feedData = await res.json();
      setInventory(feedData.inventory || []);
      setPurchases(feedData.recentPurchases || []);
      setStats(feedData.stats || null);
    } catch { toast.error('Failed to load feed data'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', ...purchaseForm }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to record purchase'); }
      const bags = parseInt(purchaseForm.numberOfBags);
      const bagKg = parseFloat(purchaseForm.bagSizeKg);
      toast.success(`Recorded: ${bags} bags × ${bagKg}kg = ${bags * bagKg}kg — stock updated`);
      setPurchaseForm({
        feedTypeId: '', date: new Date().toISOString().split('T')[0],
        numberOfBags: '', bagSizeKg: '70',
        supplierName: '', supplierContact: '', purchasePrice: '', transportCost: '',
        receiptRef: '', notes: '',
      });
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
  const totalKgThisPurchase = (parseInt(purchaseForm.numberOfBags) || 0) * (parseFloat(purchaseForm.bagSizeKg) || 0);

  // Per feed type: most recent bag size for "bags remaining" display
  const lastBagSizeByFeedType: Record<string, number> = {};
  purchases.forEach((p) => {
    if (p.bagSizeKg && !lastBagSizeByFeedType[p.feedType.id]) {
      lastBagSizeByFeedType[p.feedType.id] = p.bagSizeKg;
    }
  });

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
            <p className="text-gray-500 text-sm mt-1">Stock levels, purchases, weekly consumption and feeding guide by age</p>
          </div>
          <div className="flex gap-2">
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
            {inventory.map((f) => {
              const bagSize = lastBagSizeByFeedType[f.id];
              const bagsApprox = bagSize ? Math.round(f.totalStock / bagSize) : null;
              return (
              <div key={f.id} className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 font-medium">{f.name} stock</p>
                <p className={`text-2xl font-bold mt-1 ${f.isCritical ? 'text-red-600' : f.isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                  {f.totalStock.toFixed(0)} kg
                </p>
                {bagsApprox !== null && (
                  <p className="text-xs text-gray-400 mt-0.5">≈ {bagsApprox} bag{bagsApprox !== 1 ? 's' : ''} of {bagSize}kg</p>
                )}
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
              );
            })}
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

          {/* Feeding Guide (full width) */}
          <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b flex items-center gap-2">
                <BookOpen size={18} className="text-green-800" />
                <h2 className="font-bold text-lg">Feeding guide by age</h2>
              </div>
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100 text-gray-600 uppercase text-[10px]">
                      <th className="px-3 py-2 text-left">Wk</th>
                      <th className="px-3 py-2 text-left">Age</th>
                      <th className="px-3 py-2 text-left">Phase</th>
                      <th className="px-3 py-2 text-right">g/bird</th>
                      <th className="px-3 py-2 text-right">10 birds</th>
                      <th className="px-3 py-2 text-right">50 birds</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {FEEDING_GUIDE.map((row) => {
                      const bg = row.phaseColor === 'green' ? 'bg-green-50/60' : row.phaseColor === 'orange' ? 'bg-orange-50/60' : 'bg-blue-50/60';
                      const badge = row.phaseColor === 'green' ? 'bg-green-100 text-green-800' : row.phaseColor === 'orange' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';
                      return (
                        <tr key={row.week} className={`${bg} hover:brightness-95`}>
                          <td className="px-3 py-2 font-semibold text-gray-800">Wk {row.week}</td>
                          <td className="px-3 py-2 text-gray-600">{row.ageRange}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge}`}>{row.phase}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">{row.gPerBird}g</td>
                          <td className="px-3 py-2 text-right text-gray-700">{(row.gPerBird * 10 / 1000).toFixed(2)} kg</td>
                          <td className="px-3 py-2 text-right text-gray-700">{(row.gPerBird * 50 / 1000).toFixed(2)} kg</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t bg-amber-50/50 text-[11px] text-amber-800">
                ⚠ Feed amounts are guides only. Adjust for breed, climate and management.
              </div>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Number of bags *</label>
                    <input type="number" step="1" min="1" required value={purchaseForm.numberOfBags}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, numberOfBags: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 3" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Bag size (kg) *</label>
                    <select value={purchaseForm.bagSizeKg}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, bagSizeKg: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="50">50 kg</option>
                      <option value="70">70 kg</option>
                      <option value="90">90 kg</option>
                    </select>
                  </div>
                </div>
                {purchaseForm.numberOfBags && purchaseForm.bagSizeKg && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 font-medium">
                    Total: {parseInt(purchaseForm.numberOfBags)} bags × {parseFloat(purchaseForm.bagSizeKg)}kg = <strong>{totalKgThisPurchase} kg</strong> added to stock
                  </div>
                )}
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

      </main>
    </div>
  );
}
