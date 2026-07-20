'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Badge, formatCurrency } from '@ecokuku/ui';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Edit2, Save, X, Pencil, Trash2,
  Bird, Skull, Scale, Wheat, Syringe, ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Batch {
  id: string; batchNumber: string; type: string; status: string;
  quantity: number; currentCount: number; breed?: string; source?: string;
  supplier?: string; coopAssignment?: string; acquisitionCost?: number;
  ageAtArrival?: number;
  startDate: string; expectedReady?: string; notes?: string;
  isOpenForBooking: boolean; maxBookings?: number; bookedCount: number; pricePerChick?: number;
}
interface MortalityLog { id: string; date: string; count: number; cause?: string; notes?: string; }
interface GrowthLog { id: string; date: string; avgWeight: number | null; notes?: string; }
interface VaccinationLog { id: string; vaccineType: string; dateAdministered: string; dosage?: string; administeredBy?: string; notes?: string; }
interface FeedLog { id: string; feedType: string; recordedDate: string; quantityUsed: number; notes?: string; }

const TABS = [
  { key: 'overview', label: 'Overview', icon: Bird },
  { key: 'growth', label: 'Growth', icon: Scale },
  { key: 'mortality', label: 'Mortality', icon: Skull },
  { key: 'feed', label: 'Feed', icon: Wheat },
  { key: 'health', label: 'Health', icon: Syringe },
  { key: 'sales', label: 'Sales', icon: ShoppingCart },
];

const BATCH_TYPES = ['BROILER', 'LAYER', 'KIENYEJI', 'MIXED'];
const BATCH_STATUSES = ['ACTIVE', 'RESTING', 'SOLD_OUT', 'CULLED'];

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [mortalityLogs, setMortalityLogs] = useState<MortalityLog[]>([]);
  const [growthLogs, setGrowthLogs] = useState<GrowthLog[]>([]);
  const [vaccinationLogs, setVaccinationLogs] = useState<VaccinationLog[]>([]);
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showMortalityForm, setShowMortalityForm] = useState(false);
  const [showGrowthForm, setShowGrowthForm] = useState(false);

  const [editData, setEditData] = useState<any>({});
  const [mortalityForm, setMortalityForm] = useState({ date: new Date().toISOString().split('T')[0], count: '', cause: '', notes: '' });
  const [growthForm, setGrowthForm] = useState({ date: new Date().toISOString().split('T')[0], avgWeight: '', notes: '' });
  const [editingVax, setEditingVax] = useState<VaccinationLog | null>(null);
  const [editVaxForm, setEditVaxForm] = useState({ vaccineType: '', dateAdministered: '', dosage: '', administeredBy: '', notes: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [batchRes, mortRes, growthRes, vacRes, feedRes] = await Promise.all([
        fetch(`/api/batches?limit=100`),
        fetch(`/api/mortality-logs?batchId=${batchId}&limit=50`),
        fetch(`/api/growth-logs?batchId=${batchId}&limit=50`),
        fetch(`/api/health-logs?batchId=${batchId}&limit=50`),
        fetch(`/api/feed-logs?batchId=${batchId}&limit=50`),
      ]);

      const batchData = await batchRes.json();
      const found = (batchData.data || []).find((b: any) => b.id === batchId);
      if (found) {
        setBatch(found);
        setEditData({
          type: found.type, status: found.status, breed: found.breed || '', source: found.source || '',
          supplier: found.supplier || '', coopAssignment: found.coopAssignment || '',
          quantity: String(found.quantity), currentCount: String(found.currentCount),
          expectedReady: found.expectedReady ? new Date(found.expectedReady).toISOString().split('T')[0] : '',
          acquisitionCost: found.acquisitionCost ? String(found.acquisitionCost) : '',
          notes: found.notes || '',
          isOpenForBooking: found.isOpenForBooking, maxBookings: found.maxBookings ? String(found.maxBookings) : '',
          pricePerChick: found.pricePerChick ? String(found.pricePerChick) : '',
        });
      }

      const mortData = await mortRes.json();
      setMortalityLogs(mortData.data || []);
      const growData = await growthRes.json();
      setGrowthLogs(growData.data || []);
      const vacData = await vacRes.json();
      setVaccinationLogs(vacData.data || []);
      const feedData = await feedRes.json();
      setFeedLogs(feedData.data || []);
    } catch {
      toast.error('Failed to load batch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [batchId]);

  const handleSaveEdit = async () => {
    if (!batch) return;
    setIsSaving(true);
    try {
      const payload: any = {
        batchId: batch.id,
        type: editData.type, status: editData.status,
        breed: editData.breed || null, source: editData.source || null,
        supplier: editData.supplier || null, coopAssignment: editData.coopAssignment || null,
        quantity: parseInt(editData.quantity) || batch.quantity,
        currentCount: parseInt(editData.currentCount) || batch.currentCount,
        expectedReady: editData.expectedReady || '',
        acquisitionCost: editData.acquisitionCost || null,
        notes: editData.notes || null,
        isOpenForBooking: editData.isOpenForBooking,
        maxBookings: editData.maxBookings ? parseInt(editData.maxBookings) : null,
        pricePerChick: editData.pricePerChick ? parseFloat(editData.pricePerChick) : null,
      };
      const res = await fetch('/api/batches', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Batch updated');
      setShowEditForm(false);
      fetchAll();
    } catch { toast.error('Failed to update batch'); }
    finally { setIsSaving(false); }
  };

  const handleAddMortality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/mortality-logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batch.id, date: mortalityForm.date, count: parseInt(mortalityForm.count), cause: mortalityForm.cause || null, notes: mortalityForm.notes || null }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Mortality logged');
      setShowMortalityForm(false);
      setMortalityForm({ date: new Date().toISOString().split('T')[0], count: '', cause: '', notes: '' });
      fetchAll();
    } catch { toast.error('Failed to log mortality'); }
    finally { setIsSaving(false); }
  };

  const handleAddGrowth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/growth-logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batch.id, date: growthForm.date, avgWeight: parseFloat(growthForm.avgWeight), notes: growthForm.notes || null }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Growth recorded');
      setShowGrowthForm(false);
      setGrowthForm({ date: new Date().toISOString().split('T')[0], avgWeight: '', notes: '' });
      fetchAll();
    } catch { toast.error('Failed to record growth'); }
    finally { setIsSaving(false); }
  };

  const openEditVax = (v: VaccinationLog) => {
    setEditingVax(v);
    setEditVaxForm({
      vaccineType: v.vaccineType,
      dateAdministered: new Date(v.dateAdministered).toISOString().split('T')[0],
      dosage: v.dosage || '',
      administeredBy: v.administeredBy || '',
      notes: v.notes || '',
    });
  };

  const handleEditVaxSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVax) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/health-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaccinationId: editingVax.id,
          vaccineType: editVaxForm.vaccineType,
          dateAdministered: editVaxForm.dateAdministered,
          dosage: editVaxForm.dosage || null,
          administeredBy: editVaxForm.administeredBy || null,
          notes: editVaxForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success('Vaccination updated');
      setEditingVax(null);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVax = (v: VaccinationLog) => {
    toast(`Delete ${v.vaccineType} record?`, {
      description: new Date(v.dateAdministered).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const res = await fetch('/api/health-logs', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vaccinationId: v.id }),
            });
            if (!res.ok) throw new Error();
            toast.success('Vaccination record deleted');
            fetchAll();
          } catch { toast.error('Failed to delete'); }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  if (loading) {
    return (
      <div className="flex"><Sidebar />
        <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-64 bg-gray-200 rounded-lg mt-6" />
          </div>
        </main>
      </div>
    );
  }
  if (!batch) {
    return (
      <div className="flex"><Sidebar />
        <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100 p-8 text-center text-gray-500">Batch not found.</main>
      </div>
    );
  }

  const daysSinceStart = Math.floor((Date.now() - new Date(batch.startDate).getTime()) / 86400000);
  const ageInDays = daysSinceStart + (batch.ageAtArrival || 0);
  const ageWeeks = Math.floor(ageInDays / 7);
  const mortalityTotal = mortalityLogs.reduce((s, l) => s + l.count, 0);
  const mortalityRate = batch.quantity > 0 ? ((mortalityTotal / batch.quantity) * 100).toFixed(1) : '0';
  const latestWeight = growthLogs.length > 0 ? growthLogs[0].avgWeight : null;
  const costPerChick = batch.acquisitionCost && batch.quantity > 0 ? (Number(batch.acquisitionCost) / batch.quantity).toFixed(2) : null;

  const growthChartData = [...growthLogs].reverse().map((g) => ({
    date: new Date(g.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
    weight: Number(g.avgWeight),
  }));

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <div className="flex items-center gap-4">
            <Link href="/batches" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} className="text-gray-600" /></Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono">{batch.batchNumber}</h1>
                <Badge className="bg-green-100 text-green-800 text-xs">{batch.type}</Badge>
                <Badge className="bg-gray-100 text-gray-700 text-xs">{batch.status}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {batch.currentCount.toLocaleString()} birds · Week {ageWeeks} · {batch.coopAssignment || 'No coop assigned'}
              </p>
            </div>
            <button onClick={() => setShowEditForm(!showEditForm)}
              className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Edit2 size={15} /> Edit Batch
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="px-6 pt-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs text-gray-500">Age</p>
            <p className="text-xl font-bold">{ageWeeks} wk</p>
            <p className="text-xs text-gray-400">{ageInDays} days</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs text-gray-500">Live Count</p>
            <p className="text-xl font-bold">{batch.currentCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400">of {batch.quantity.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs text-gray-500">Mortality</p>
            <p className={`text-xl font-bold ${mortalityTotal > 0 ? 'text-red-600' : 'text-gray-900'}`}>{mortalityTotal}</p>
            <p className="text-xs text-gray-400">{mortalityRate}% rate</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs text-gray-500">Latest Weight</p>
            <p className="text-xl font-bold">{latestWeight ? `${Number(latestWeight).toFixed(2)} kg` : '—'}</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs text-gray-500">Cost / Chick</p>
            <p className="text-xl font-bold">{costPerChick ? `KSh ${costPerChick}` : '—'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-5">
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === tab.key ? 'border-green-700 text-green-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {showEditForm ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg mb-2">Edit Batch Details</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select value={editData.type} onChange={(e) => setEditData({ ...editData, type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                        {BATCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                        {BATCH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                      <input type="text" value={editData.breed} onChange={(e) => setEditData({ ...editData, breed: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                      <input type="text" value={editData.source} onChange={(e) => setEditData({ ...editData, source: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                      <input type="text" value={editData.supplier} onChange={(e) => setEditData({ ...editData, supplier: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Coop / House</label>
                      <input type="text" value={editData.coopAssignment} onChange={(e) => setEditData({ ...editData, coopAssignment: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Count</label>
                      <input type="number" value={editData.currentCount} onChange={(e) => setEditData({ ...editData, currentCount: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Expected Ready</label>
                      <input type="date" value={editData.expectedReady} onChange={(e) => setEditData({ ...editData, expectedReady: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Cost (KSh)</label>
                      <input type="number" step="0.01" value={editData.acquisitionCost} onChange={(e) => setEditData({ ...editData, acquisitionCost: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea rows={2} value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" /></div>
                  <div className="border-t pt-4 mt-2">
                    <h4 className="font-semibold text-sm mb-3">Customer Booking Settings</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editData.isOpenForBooking} onChange={(e) => setEditData({ ...editData, isOpenForBooking: e.target.checked })} /> Open for booking</label>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Bookings</label>
                        <input type="number" value={editData.maxBookings} onChange={(e) => setEditData({ ...editData, maxBookings: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Price/Chick (KSh)</label>
                        <input type="number" step="0.01" value={editData.pricePerChick} onChange={(e) => setEditData({ ...editData, pricePerChick: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={handleSaveEdit} disabled={isSaving} className="px-6 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}</button>
                    <button onClick={() => setShowEditForm(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                  <div><span className="text-gray-500">Batch Number</span><p className="font-semibold font-mono">{batch.batchNumber}</p></div>
                  <div><span className="text-gray-500">Type</span><p className="font-semibold">{batch.type}</p></div>
                  <div><span className="text-gray-500">Status</span><p className="font-semibold">{batch.status}</p></div>
                  <div><span className="text-gray-500">Breed</span><p className="font-semibold">{batch.breed || '—'}</p></div>
                  <div><span className="text-gray-500">Source</span><p className="font-semibold">{batch.source || '—'}</p></div>
                  <div><span className="text-gray-500">Supplier</span><p className="font-semibold">{batch.supplier || '—'}</p></div>
                  <div><span className="text-gray-500">Coop / House</span><p className="font-semibold">{batch.coopAssignment || '—'}</p></div>
                  <div><span className="text-gray-500">Start Date</span><p className="font-semibold">{new Date(batch.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                  <div><span className="text-gray-500">Expected Ready</span><p className="font-semibold">{batch.expectedReady ? new Date(batch.expectedReady).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p></div>
                  <div><span className="text-gray-500">Acquisition Cost</span><p className="font-semibold">{batch.acquisitionCost ? `${formatCurrency(Number(batch.acquisitionCost))} (${costPerChick}/chick)` : '—'}</p></div>
                  {batch.notes && <div className="col-span-full"><span className="text-gray-500">Notes</span><p className="font-semibold">{batch.notes}</p></div>}
                </div>
              )}
            </div>
          )}

          {/* GROWTH TAB */}
          {activeTab === 'growth' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Growth Tracking</h3>
                <button onClick={() => setShowGrowthForm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700"><Plus size={15} /> Record Weight</button>
              </div>
              {growthChartData.length > 1 && (
                <div className="bg-white rounded-xl border p-6">
                  <h4 className="font-semibold text-sm mb-4">Weight Over Time (kg)</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={growthChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(2)} kg`} />
                      <Line type="monotone" dataKey="weight" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="overflow-x-auto bg-white rounded-xl border">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600"><tr>
                    <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Avg Weight (kg)</th><th className="px-4 py-3 text-left">Age</th><th className="px-4 py-3 text-left">Notes</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {growthLogs.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No growth records yet</td></tr> :
                      growthLogs.map((g) => {
                        const measureAge = Math.floor((new Date(g.date).getTime() - new Date(batch.startDate).getTime()) / 86400000);
                        return (<tr key={g.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{new Date(g.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                          <td className="px-4 py-3 text-sm font-semibold">{g.avgWeight ? Number(g.avgWeight).toFixed(2) : '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">Day {measureAge} (Wk {Math.floor(measureAge / 7)})</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{g.notes || '—'}</td>
                        </tr>);
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MORTALITY TAB */}
          {activeTab === 'mortality' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Mortality Log</h3>
                  <p className="text-sm text-gray-500">Total: {mortalityTotal} deaths ({mortalityRate}% of {batch.quantity})</p>
                </div>
                <button onClick={() => setShowMortalityForm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"><Plus size={15} /> Log Deaths</button>
              </div>
              <div className="overflow-x-auto bg-white rounded-xl border">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600"><tr>
                    <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-right">Deaths</th><th className="px-4 py-3 text-right">Cumulative</th><th className="px-4 py-3 text-left">Cause</th><th className="px-4 py-3 text-left">Notes</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {mortalityLogs.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No mortality records</td></tr> :
                      (() => {
                        let cumulative = 0;
                        return [...mortalityLogs].reverse().map((m) => {
                          cumulative += m.count;
                          return (<tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{new Date(m.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{m.count}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">{cumulative}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{m.cause || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{m.notes || '—'}</td>
                          </tr>);
                        });
                      })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FEED TAB */}
          {activeTab === 'feed' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Feed Consumption for {batch.batchNumber}</h3>
                <Link href="/feed" className="text-sm text-green-700 font-medium hover:underline">Go to Feed Management →</Link>
              </div>
              <div className="overflow-x-auto bg-white rounded-xl border">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600"><tr>
                    <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Feed Type</th><th className="px-4 py-3 text-right">Qty Used (kg)</th><th className="px-4 py-3 text-left">Notes</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {feedLogs.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No feed logs for this batch. <Link href="/feed" className="text-green-700 underline">Log feed consumption</Link></td></tr> :
                      feedLogs.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{new Date(f.recordedDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                          <td className="px-4 py-3 text-sm font-medium">{f.feedType}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">{Number(f.quantityUsed).toFixed(1)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{f.notes || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HEALTH TAB */}
          {activeTab === 'health' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Vaccination History for {batch.batchNumber}</h3>
                <Link href="/health" className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700"><Plus size={15} /> Log Vaccination</Link>
              </div>
              <div className="overflow-x-auto bg-white rounded-xl border">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600"><tr>
                    <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Vaccine</th><th className="px-4 py-3 text-left">Dosage</th><th className="px-4 py-3 text-left">Administered By</th><th className="px-4 py-3 text-left">Notes</th><th className="px-4 py-3 text-center">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {vaccinationLogs.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No vaccinations logged for this batch</td></tr> :
                      vaccinationLogs.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50 group">
                          <td className="px-4 py-3 text-sm">{new Date(v.dateAdministered).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</td>
                          <td className="px-4 py-3 text-sm font-medium">{v.vaccineType}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{v.dosage || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{v.administeredBy || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{v.notes || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditVax(v)} title="Edit"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => handleDeleteVax(v)} title="Delete"
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SALES TAB */}
          {activeTab === 'sales' && (
            <div className="space-y-5">
              <h3 className="font-bold text-lg">Sales from {batch.batchNumber}</h3>
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                <ShoppingCart size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Sales tracking coming soon</p>
                <p className="text-sm mt-1">Orders fulfilled from this batch will appear here once linked.</p>
                <Link href="/orders" className="text-sm text-green-700 font-medium hover:underline mt-3 inline-block">View all orders →</Link>
              </div>
            </div>
          )}
        </div>

        {/* ADD MORTALITY MODAL */}
        {showMortalityForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b flex justify-between"><h2 className="font-bold text-lg">Log Mortality</h2>
                <button onClick={() => setShowMortalityForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
              <form onSubmit={handleAddMortality} className="p-5 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" required value={mortalityForm.date} onChange={(e) => setMortalityForm({ ...mortalityForm, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Number of Deaths *</label>
                  <input type="number" required min="1" value={mortalityForm.count} onChange={(e) => setMortalityForm({ ...mortalityForm, count: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Cause</label>
                  <input type="text" value={mortalityForm.cause} onChange={(e) => setMortalityForm({ ...mortalityForm, cause: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Disease, predation, heat stress" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={mortalityForm.notes} onChange={(e) => setMortalityForm({ ...mortalityForm, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" /></div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold disabled:opacity-50">{isSaving ? 'Saving...' : 'Log Deaths'}</button>
                  <button type="button" onClick={() => setShowMortalityForm(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD GROWTH MODAL */}
        {showGrowthForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b flex justify-between"><h2 className="font-bold text-lg">Record Weight</h2>
                <button onClick={() => setShowGrowthForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
              <form onSubmit={handleAddGrowth} className="p-5 space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" required value={growthForm.date} onChange={(e) => setGrowthForm({ ...growthForm, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Average Weight (kg) *</label>
                  <input type="number" required step="0.01" min="0" value={growthForm.avgWeight} onChange={(e) => setGrowthForm({ ...growthForm, avgWeight: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={growthForm.notes} onChange={(e) => setGrowthForm({ ...growthForm, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" /></div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                  Customers with batch orders for this batch will automatically receive a growth update notification.
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Weight'}</button>
                  <button type="button" onClick={() => setShowGrowthForm(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT VACCINATION MODAL */}
        {editingVax && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold text-lg">Edit Vaccination Record</h2>
                <button onClick={() => setEditingVax(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleEditVaxSave} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine *</label>
                  <input type="text" required value={editVaxForm.vaccineType}
                    onChange={(e) => setEditVaxForm({ ...editVaxForm, vaccineType: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={editVaxForm.dateAdministered}
                      onChange={(e) => setEditVaxForm({ ...editVaxForm, dateAdministered: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                    <input type="text" value={editVaxForm.dosage}
                      onChange={(e) => setEditVaxForm({ ...editVaxForm, dosage: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 1 drop per bird" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Administered By</label>
                  <input type="text" value={editVaxForm.administeredBy}
                    onChange={(e) => setEditVaxForm({ ...editVaxForm, administeredBy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Name or role" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={editVaxForm.notes}
                    onChange={(e) => setEditVaxForm({ ...editVaxForm, notes: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setEditingVax(null)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold">
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
