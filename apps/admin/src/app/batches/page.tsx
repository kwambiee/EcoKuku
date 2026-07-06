'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Badge, formatCurrency } from '@ecokuku/ui';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Bird, AlertTriangle, Search, ArrowUpDown, Eye, X, TrendingDown, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface Batch {
  id: string;
  batchNumber: string;
  type: string;
  quantity: number;
  currentCount: number;
  status: string;
  startDate: string;
  source?: string;
  supplier?: string;
  coopAssignment?: string;
  acquisitionCost?: number;
  costPerChick?: number;
  notes?: string;
  isOpenForBooking: boolean;
  bookedCount: number;
  ageWeeks: number;
  ageDays: number;
  healthAlerts: string[];
}

interface Stats {
  totalBirds: number;
  activeBatchCount: number;
  mortalityThisMonth: number;
  mortalityRate: string;
  healthAlerts: number;
  typeBreakdown: Record<string, number>;
}

type SortKey = 'batchNumber' | 'type' | 'currentCount' | 'ageWeeks' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  RESTING: 'bg-blue-100 text-blue-800',
  SOLD_OUT: 'bg-gray-100 text-gray-700',
  CULLED: 'bg-red-100 text-red-700',
};
const TYPE_LABELS: Record<string, string> = {
  BROILER: 'Broiler', LAYER: 'Layer', KIENYEJI: 'Kienyeji', MIXED: 'Mixed',
};
const TYPE_BADGE_COLORS: Record<string, string> = {
  BROILER: 'bg-amber-100 text-amber-800',
  LAYER: 'bg-blue-100 text-blue-800',
  KIENYEJI: 'bg-green-100 text-green-800',
  MIXED: 'bg-purple-100 text-purple-800',
};
const TYPE_ORDER = ['LAYER', 'BROILER', 'KIENYEJI', 'MIXED'];

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHealthOnly, setShowHealthOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('ageWeeks');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [formData, setFormData] = useState({
    batchNumber: '', type: 'BROILER', quantity: '', startDate: new Date().toISOString().split('T')[0],
    source: 'PURCHASED', supplier: '', coopAssignment: '', acquisitionCost: '', ageAtArrival: '0', notes: '',
  });

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`/api/batches?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBatches(data.data || []);
      setStats(data.stats || null);
    } catch {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, [statusFilter]);

  const generateBatchNumber = () => {
    const d = new Date(formData.startDate);
    const datePart = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const prefix = `B-${datePart}-`;
    const existing = batches.filter((b) => b.batchNumber.startsWith(prefix)).length;
    return `${prefix}${String(existing + 1).padStart(2, '0')}`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchNumber: formData.batchNumber,
          type: formData.type,
          quantity: formData.quantity,
          startDate: formData.startDate,
          source: formData.source,
          supplier: formData.supplier || null,
          coopAssignment: formData.coopAssignment || null,
          acquisitionCost: formData.acquisitionCost || null,
          ageAtArrival: formData.ageAtArrival || '0',
          notes: formData.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create batch');
      }
      toast.success('Batch created');
      setShowCreateModal(false);
      fetchBatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingBatch) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: deletingBatch.id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(`${deletingBatch.batchNumber} deleted`);
      setShowDeleteModal(false);
      setDeletingBatch(null);
      fetchBatches();
    } catch {
      toast.error('Failed to delete batch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Filter and sort
  let filtered = batches;
  if (typeFilter) filtered = filtered.filter((b) => b.type === typeFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((b) => b.batchNumber.toLowerCase().includes(q) || (b.coopAssignment || '').toLowerCase().includes(q));
  }
  if (showHealthOnly) filtered = filtered.filter((b) => b.healthAlerts.length > 0);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'batchNumber': cmp = a.batchNumber.localeCompare(b.batchNumber); break;
      case 'type': cmp = a.type.localeCompare(b.type); break;
      case 'currentCount': cmp = a.currentCount - b.currentCount; break;
      case 'ageWeeks': cmp = a.ageWeeks - b.ageWeeks; break;
      case 'status': cmp = a.status.localeCompare(b.status); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Group by type for display
  const grouped: Record<string, Batch[]> = {};
  for (const b of sorted) {
    if (!grouped[b.type]) grouped[b.type] = [];
    grouped[b.type].push(b);
  }
  const orderedTypes = TYPE_ORDER.filter((t) => grouped[t]);

  const SortTh = ({ label, field, className }: { label: string; field: SortKey; className?: string }) => (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100 select-none ${className || ''}`}
      onClick={() => handleSort(field)}>
      <span className="inline-flex items-center gap-1">{label}
        <ArrowUpDown size={10} className={sortKey === field ? 'text-green-700' : 'text-gray-300'} />
      </span>
    </th>
  );

  const typeBreakdownStr = stats ? Object.entries(stats.typeBreakdown)
    .map(([t, c]) => `${c} ${t}`).join(' · ') : '';

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bird size={28} className="text-green-700" />
            <div>
              <h1 className="text-2xl font-bold">Batch Management</h1>
              <p className="text-gray-500 text-sm">Track every flock from arrival to sale</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-44 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <button onClick={() => {
              const bn = generateBatchNumber();
              setFormData({ batchNumber: bn, type: 'BROILER', quantity: '', startDate: new Date().toISOString().split('T')[0], source: 'PURCHASED', supplier: '', coopAssignment: '', acquisitionCost: '', ageAtArrival: '0', notes: '' });
              setShowCreateModal(true);
            }}
              className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 text-sm">
              <Plus size={16} /> New Batch
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Summary Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Bird size={13} /> Total live birds</div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBirds.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">All active batches</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Bird size={13} /> Active batches</div>
                <p className="text-2xl font-bold text-gray-900">{stats.activeBatchCount}</p>
                <p className="text-xs text-gray-400 mt-1">{typeBreakdownStr || 'No active batches'}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><TrendingDown size={13} /> Mortality this month</div>
                <p className={`text-2xl font-bold ${stats.mortalityThisMonth > 0 ? 'text-red-600' : 'text-gray-900'}`}>{stats.mortalityThisMonth}</p>
                <p className="text-xs text-gray-400 mt-1">{stats.mortalityRate}% rate{parseFloat(stats.mortalityRate) < 2 ? ' — acceptable' : ''}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><ShieldAlert size={13} /> Health alerts</div>
                <p className={`text-2xl font-bold ${stats.healthAlerts > 0 ? 'text-red-600' : 'text-green-700'}`}>{stats.healthAlerts}</p>
                <p className="text-xs text-gray-400 mt-1">{stats.healthAlerts > 0 ? 'Vaccination overdue' : 'All vaccinations up to date'}</p>
              </div>
            </div>
          )}

          {/* Filter Row */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">All batches</span>
            <div className="flex gap-1.5">
              {['', ...TYPE_ORDER].map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${typeFilter === t ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {t ? TYPE_LABELS[t] || t : 'All'}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 ml-auto">
              {['', 'ACTIVE', 'RESTING', 'SOLD_OUT', 'CULLED'].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {s || 'All Status'}
                </button>
              ))}
            </div>
            <button onClick={() => setShowHealthOnly(!showHealthOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${showHealthOnly ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <AlertTriangle size={12} /> Health alerts
            </button>
          </div>

          {/* Grouped Table */}
          <div className="bg-white rounded-xl border border-gray-200">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : sorted.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bird size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No batches found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <SortTh label="Batch" field="batchNumber" />
                      <SortTh label="Type" field="type" />
                      <SortTh label="Live count" field="currentCount" />
                      <SortTh label="Age" field="ageWeeks" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Coop</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Source</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Health status</th>
                      <SortTh label="Status" field="status" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedTypes.map((type) => (
                      <Fragment key={type}>
                        <tr>
                          <td colSpan={9} className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{TYPE_LABELS[type] || type}S</span>
                          </td>
                        </tr>
                        {grouped[type].map((batch) => (
                          <tr key={batch.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono font-semibold text-sm text-gray-900">{batch.batchNumber}</td>
                            <td className="px-4 py-3">
                              <Badge className={`text-xs ${TYPE_BADGE_COLORS[batch.type] || 'bg-gray-100 text-gray-700'}`}>
                                {TYPE_LABELS[batch.type] || batch.type}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-gray-900">{batch.currentCount.toLocaleString()}</span>
                              {batch.currentCount < batch.quantity && (
                                <span className="block text-xs text-gray-400">started: {batch.quantity.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">Wk {batch.ageWeeks}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{batch.coopAssignment || '—'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="text-gray-700">{batch.source === 'INCUBATION' ? 'Own farm' : batch.source === 'OWN_FARM' ? 'Own farm' : 'Purchased'}</span>
                              {batch.supplier && <span className="block text-xs text-gray-400">{batch.supplier}</span>}
                              {batch.source === 'INCUBATION' && <span className="block text-xs text-gray-400">Incubation</span>}
                            </td>
                            <td className="px-4 py-3">
                              {batch.healthAlerts.length > 0 ? (
                                <Link href="/health" className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${batch.healthAlerts[0].includes('overdue') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                  <AlertTriangle size={11} /> {batch.healthAlerts[0]}
                                </Link>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                                  ✓ All good
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`text-xs ${STATUS_COLORS[batch.status] || 'bg-gray-100 text-gray-700'}`}>
                                {batch.status === 'SOLD_OUT' ? 'Winding down' : batch.status.charAt(0) + batch.status.slice(1).toLowerCase()}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5">
                                <Link href={`/batches/${batch.id}`}
                                  className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                                  View
                                </Link>
                                <Link href={`/batches/${batch.id}`}
                                  className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                                  Edit
                                </Link>
                                {batch.status === 'SOLD_OUT' && (
                                  <button onClick={() => { setDeletingBatch(batch); setShowDeleteModal(true); }}
                                    className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">
                                    Cull
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CREATE MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-200 flex justify-between sticky top-0 bg-white z-10">
                <h2 className="font-bold text-xl">New Batch</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                    <input type="date" required value={formData.startDate}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        const datePart = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                        const prefix = `B-${datePart}-`;
                        const existing = batches.filter((b) => b.batchNumber.startsWith(prefix)).length;
                        const bn = `${prefix}${String(existing + 1).padStart(2, '0')}`;
                        setFormData({ ...formData, startDate: e.target.value, batchNumber: bn });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Number</label>
                    <input type="text" readOnly value={formData.batchNumber}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 font-mono cursor-not-allowed" />
                    <p className="text-xs text-gray-400 mt-0.5">Auto-generated</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
                    <select required value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="BROILER">Broiler — raised for meat</option>
                      <option value="LAYER">Layer — raised for eggs</option>
                      <option value="KIENYEJI">Kienyeji — traditional free-range</option>
                      <option value="MIXED">Mixed — multiple breeds/types</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Number of Chicks *</label>
                    <input type="number" required min="1" value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Age at Arrival (days)</label>
                    <input type="number" min="0" value={formData.ageAtArrival}
                      onChange={(e) => setFormData({ ...formData, ageAtArrival: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                    <p className="text-xs text-gray-400 mt-0.5">0 for day-old chicks, 7 for 1-week-old, etc.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Source</label>
                    <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="PURCHASED">Purchased from supplier</option>
                      <option value="OWN_FARM">Own farm / hatched</option>
                    </select>
                  </div>
                  {formData.source === 'PURCHASED' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier</label>
                      <input type="text" value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Kenchic" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Coop / House</label>
                    <input type="text" value={formData.coopAssignment}
                      onChange={(e) => setFormData({ ...formData, coopAssignment: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Coop A" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Total Acquisition Cost (KSh)</label>
                    <input type="number" step="0.01" value={formData.acquisitionCost}
                      onChange={(e) => setFormData({ ...formData, acquisitionCost: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 50000" />
                    <p className="text-xs text-gray-400 mt-0.5">Auto-creates expense record</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="e.g. Breed: Kuroiler | Vaccination status at purchase | Special notes" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSaving ? 'Creating...' : 'Create Batch'}
                  </button>
                  <button type="button" onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {showDeleteModal && deletingBatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Delete Batch?</h3>
                <p className="text-gray-600 text-sm">
                  Delete <strong>{deletingBatch.batchNumber}</strong> ({deletingBatch.currentCount} birds)?
                  All mortality, growth, vaccination, and feed logs will be permanently deleted.
                </p>
                <div className="flex gap-3 mt-6">
                  <button onClick={confirmDelete} disabled={isSaving}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
                    {isSaving ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button onClick={() => { setShowDeleteModal(false); setDeletingBatch(null); }}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Need Fragment for JSX grouping
import { Fragment } from 'react';
