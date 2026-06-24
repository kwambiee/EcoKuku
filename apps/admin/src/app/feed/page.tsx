'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import { Plus, AlertTriangle, TrendingDown, Package, RefreshCw, Trash2, ShoppingCart, BookOpen, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface FeedInventory {
  id: string; name: string; supplier?: string; costPerUnit: number;
  totalStock: number; unit: string; dailyAvgConsumption: number;
  daysRemaining: number | null; isLow: boolean;
}

interface FeedLog {
  id: string; feedType: string; recordedDate: string;
  quantityUsed: number; quantityRemaining?: number; notes?: string;
}

interface FeedPurchaseRecord {
  id: string;
  date: string;
  quantity: number;
  unit: string;
  supplierName: string;
  supplierContact?: string;
  purchasePrice: number;
  transportCost: number;
  totalCost: number;
  receiptRef?: string;
  notes?: string;
  feedType: { id: string; name: string };
}

type Action = 'idle' | 'purchase' | 'consume' | 'add_type';

const FEEDING_GUIDE = [
  { ageRange: '0-1 weeks', feedType: 'Chick Starter Crumb', kgPer100Birds: '1-1.5 kg/day', supplements: 'Glucose in water for first 3 days, warmth' },
  { ageRange: '1-2 weeks', feedType: 'Chick Starter Crumb', kgPer100Birds: '1.5-2 kg/day', supplements: 'Vitamins, clean water' },
  { ageRange: '2-4 weeks', feedType: 'Chick Starter/Grower', kgPer100Birds: '3-4 kg/day', supplements: 'Vitamins, electrolytes in water' },
  { ageRange: '4-8 weeks', feedType: 'Grower Mash/Pellets', kgPer100Birds: '5-7 kg/day', supplements: 'Grit, calcium supplement for layers' },
  { ageRange: '8-16 weeks', feedType: 'Grower/Developer Mash', kgPer100Birds: '8-10 kg/day', supplements: 'Layer prep supplements from week 14' },
  { ageRange: '16-20 weeks', feedType: 'Pre-layer / Broiler Finisher', kgPer100Birds: '10-11 kg/day', supplements: 'Calcium/oyster shell for layers, reduce protein for broilers' },
  { ageRange: '20+ weeks', feedType: 'Layer Mash / Maintenance', kgPer100Birds: '10-12 kg/day', supplements: 'Calcium/oyster shell, vitamins, access to greens' },
];

function getGuideForAge(days: number) {
  const weeks = days / 7;
  if (weeks < 1) return FEEDING_GUIDE[0];
  if (weeks < 2) return FEEDING_GUIDE[1];
  if (weeks < 4) return FEEDING_GUIDE[2];
  if (weeks < 8) return FEEDING_GUIDE[3];
  if (weeks < 16) return FEEDING_GUIDE[4];
  if (weeks < 20) return FEEDING_GUIDE[5];
  return FEEDING_GUIDE[6];
}

export default function FeedPage() {
  const [inventory, setInventory] = useState<FeedInventory[]>([]);
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [purchases, setPurchases] = useState<FeedPurchaseRecord[]>([]);
  const [batches, setBatches] = useState<{ id: string; batchNumber: string; startDate: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<Action>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [showFeedingGuide, setShowFeedingGuide] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({
    feedTypeId: '', date: new Date().toISOString().split('T')[0], quantity: '',
    supplierName: '', supplierContact: '', purchasePrice: '', transportCost: '',
    receiptRef: '', notes: '',
  });
  const [consumeForm, setConsumeForm] = useState({ feedTypeName: '', quantityUsed: '', batchId: '', notes: '' });
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase', ...purchaseForm }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record purchase');
      }
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_consumption', ...consumeForm }),
      });
      if (!res.ok) throw new Error('Failed to log');
      toast.success('Consumption logged and stock deducted');
      setConsumeForm({ feedTypeName: '', quantityUsed: '', batchId: '', notes: '' });
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedTypeId: id }),
    });
    toast.success(`${name} removed`);
    fetchAll();
  };

  const totalStock = inventory.reduce((s, f) => s + f.totalStock, 0);
  const lowItems = inventory.filter((f) => f.isLow);
  const avgDailyConsumption = inventory.reduce((s, f) => s + f.dailyAvgConsumption, 0);

  // Compute total cost from purchasePrice + transportCost for display
  const computedTotal = (parseFloat(purchaseForm.purchasePrice) || 0) + (parseFloat(purchaseForm.transportCost) || 0);

  // Batch age tip for consumption form
  const selectedBatch = batches.find((b) => b.id === consumeForm.batchId);
  const batchAgeDays = selectedBatch ? Math.floor((Date.now() - new Date(selectedBatch.startDate).getTime()) / 86400000) : null;
  const batchAgeWeeks = batchAgeDays !== null ? Math.floor(batchAgeDays / 7) : null;
  const batchGuide = batchAgeDays !== null ? getGuideForAge(batchAgeDays) : null;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Feed Management</h1>
            <p className="text-gray-600 mt-1">Track feed stock, purchases, daily consumption, and restocking</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAll} className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <RefreshCw size={14} />
            </button>
            <button onClick={() => setAction('add_type')}
              className="flex items-center gap-2 px-3 py-2 border border-green-300 text-green-800 rounded-lg text-sm font-medium hover:bg-green-50">
              <Plus size={15} /> Feed Type
            </button>
            <button onClick={async () => { await fetchAll(); setAction('purchase'); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <ShoppingCart size={15} /> Record Purchase
            </button>
            <button onClick={() => setAction('consume')}
              className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <TrendingDown size={15} /> Log Daily Use
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Low Stock Alerts */}
          {lowItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Low Stock Warning</p>
                <ul className="mt-1 space-y-0.5">
                  {lowItems.map((f) => (
                    <li key={f.id} className="text-sm text-amber-800">
                      • <strong>{f.name}</strong>: {f.totalStock.toFixed(1)} {f.unit} left
                      {f.daysRemaining !== null && ` — only ${f.daysRemaining} day${f.daysRemaining !== 1 ? 's' : ''} remaining at current usage`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-500">Total Feed Stock</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalStock.toFixed(0)} kg</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-500">Daily Avg Consumption</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{avgDailyConsumption.toFixed(1)} kg/day</p>
              <p className="text-xs text-gray-400 mt-0.5">7-day average</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className={`text-2xl font-bold mt-1 ${lowItems.length > 0 ? 'text-amber-600' : 'text-green-700'}`}>{lowItems.length}</p>
            </div>
          </div>

          {/* Feed Inventory */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-lg">Feed Stock Levels</h2>
              {inventory.length === 0 && (
                <button onClick={() => setAction('add_type')} className="text-sm text-green-700 font-medium hover:underline">
                  Add your first feed type →
                </button>
              )}
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
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Feed Type</th>
                      <th className="px-4 py-3 text-left">Supplier</th>
                      <th className="px-4 py-3 text-right">Current Stock</th>
                      <th className="px-4 py-3 text-right">Daily Usage</th>
                      <th className="px-4 py-3 text-right">Days Left</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.map((f) => (
                      <tr key={f.id} className={`hover:bg-gray-50 ${f.isLow ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-sm text-gray-900">{f.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{f.supplier || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-sm">
                          <span className={f.isLow ? 'text-amber-700' : 'text-gray-900'}>
                            {f.totalStock.toFixed(1)} {f.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {f.dailyAvgConsumption > 0 ? `${f.dailyAvgConsumption} ${f.unit}/day` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {f.daysRemaining !== null ? (
                            <span className={f.daysRemaining < 7 ? 'text-amber-700 font-bold' : 'text-gray-700'}>
                              {f.daysRemaining} days
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.isLow ? 'bg-amber-100 text-amber-700' : f.totalStock === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {f.totalStock === 0 ? 'Out of Stock' : f.isLow ? 'Low' : 'OK'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => deleteFeedType(f.id, f.name)} className="p-1 text-red-400 hover:text-red-600">
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

          {/* Consumption log */}
          {logs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-5 border-b border-gray-200">
                <h2 className="font-bold">Recent Consumption Log</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Feed Type</th>
                      <th className="px-4 py-3 text-right">Used</th>
                      <th className="px-4 py-3 text-right">Remaining After</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.slice(0, 20).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{new Date(log.recordedDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 text-sm font-medium">{log.feedType}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-red-700">{Number(log.quantityUsed).toFixed(1)} kg</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {log.quantityRemaining != null ? `${Number(log.quantityRemaining).toFixed(1)} kg` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{log.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Purchase History */}
          {purchases.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-5 border-b border-gray-200">
                <h2 className="font-bold">Purchase History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Feed Type</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-left">Supplier</th>
                      <th className="px-4 py-3 text-right">Purchase Price</th>
                      <th className="px-4 py-3 text-right">Transport</th>
                      <th className="px-4 py-3 text-right">Total Cost</th>
                      <th className="px-4 py-3 text-left">Receipt Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{new Date(p.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3 text-sm font-medium">{p.feedType.name}</td>
                        <td className="px-4 py-3 text-right text-sm">{Number(p.quantity).toFixed(1)} {p.unit}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{p.supplierName}</td>
                        <td className="px-4 py-3 text-right text-sm">KSh {Number(p.purchasePrice).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">{Number(p.transportCost) > 0 ? `KSh ${Number(p.transportCost).toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-green-800">KSh {Number(p.totalCost).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{p.receiptRef || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Feeding Guide by Age */}
          <div className="bg-white rounded-lg border border-gray-200">
            <button
              onClick={() => setShowFeedingGuide(!showFeedingGuide)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-green-800" />
                <h2 className="font-bold text-lg">Feeding Guide by Age</h2>
              </div>
              {showFeedingGuide ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {showFeedingGuide && (
              <div className="border-t border-gray-200 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-green-50 text-xs uppercase text-green-900">
                    <tr>
                      <th className="px-4 py-3 text-left">Age Range</th>
                      <th className="px-4 py-3 text-left">Feed Type</th>
                      <th className="px-4 py-3 text-left">Per 100 Birds</th>
                      <th className="px-4 py-3 text-left">Supplements / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {FEEDING_GUIDE.map((row, i) => (
                      <tr key={i} className="hover:bg-green-50/50">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{row.ageRange}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{row.feedType}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.kgPer100Birds}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.supplements}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ADD FEED TYPE MODAL */}
        {action === 'add_type' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b border-gray-200 flex justify-between">
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Unga Feeds" />
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
              <div className="p-5 border-b border-gray-200 flex justify-between sticky top-0 bg-white rounded-t-xl">
                <h2 className="font-bold text-xl">Record Feed Purchase</h2>
                <button onClick={() => setAction('idle')} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handlePurchase} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Purchase *</label>
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
                    {inventory.length === 0 && <p className="text-xs text-amber-600 mt-1">Add feed types first using the &quot;Feed Type&quot; button.</p>}
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Unga Feeds" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier Contact</label>
                    <input type="text" value={purchaseForm.supplierContact}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierContact: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Phone or email" />
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Transportation Cost (KSh)</label>
                    <input type="number" step="0.01" value={purchaseForm.transportCost}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, transportCost: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                </div>

                {/* Auto-calculated total */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total Cost</span>
                  <span className="text-lg font-bold text-green-800">KSh {computedTotal.toLocaleString()}</span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Receipt Reference</label>
                  <input type="text" value={purchaseForm.receiptRef}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, receiptRef: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Receipt number or ref" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea value={purchaseForm.notes}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2}
                    placeholder="Any additional notes about this purchase..." />
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
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
              <div className="p-5 border-b border-gray-200 flex justify-between">
                <h2 className="font-bold text-xl">Log Daily Feed Consumption</h2>
                <button onClick={() => setAction('idle')} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleConsume} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Feed Type *</label>
                    <select required value={consumeForm.feedTypeName} onChange={(e) => setConsumeForm({ ...consumeForm, feedTypeName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select...</option>
                      {inventory.map((f) => <option key={f.id} value={f.name}>{f.name} ({f.totalStock.toFixed(0)} {f.unit} left)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity Used (kg) *</label>
                    <input type="number" step="0.1" required value={consumeForm.quantityUsed}
                      onChange={(e) => setConsumeForm({ ...consumeForm, quantityUsed: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Batch <span className="font-normal text-gray-400">(optional)</span></label>
                  <select value={consumeForm.batchId} onChange={(e) => setConsumeForm({ ...consumeForm, batchId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">All batches / general</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.batchNumber}</option>)}
                  </select>
                </div>

                {/* Batch age tip */}
                {batchGuide && batchAgeDays !== null && batchAgeWeeks !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      This batch is <strong>{batchAgeDays} days</strong> old (~{batchAgeWeeks} weeks).
                      Recommended: <strong>{batchGuide.kgPer100Birds}</strong> per 100 birds of <strong>{batchGuide.feedType}</strong>.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <input type="text" value={consumeForm.notes}
                    onChange={(e) => setConsumeForm({ ...consumeForm, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Any observations..." />
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
      </main>
    </div>
  );
}
