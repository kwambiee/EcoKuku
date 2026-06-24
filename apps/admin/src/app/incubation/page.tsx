'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Badge } from '@ecokuku/ui';
import { toast } from 'sonner';
import { Plus, ArrowRight, Egg, CheckCircle, Info, Eye, ArrowUpDown, AlertTriangle, X, Trash2 } from 'lucide-react';

interface IncubationBatch {
  id: string;
  batchNumber: string;
  eggCount: number;
  startDate: string;
  expectedHatchDate: string;
  hatchedCount: number;
  failedCount: number;
  weakChicks: number;
  temperature?: number;
  humidity?: number;
  eggSource?: string;
  supplier?: string;
  status: string;
  coopAssignment?: string;
  transferDate?: string;
  notes?: string;
}

type SortKey = 'batchNumber' | 'eggCount' | 'startDate' | 'expectedHatchDate' | 'status';
type SortDir = 'asc' | 'desc';

const EGG_SOURCES = [
  { value: 'OWN_FARM', label: 'Own farm' },
  { value: 'PURCHASED', label: 'Purchased from supplier' },
];

const STATUS_COLORS: Record<string, string> = {
  INCUBATING: 'bg-blue-100 text-blue-800',
  HATCHING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = {
  batchNumber: '',
  eggCount: '',
  startDate: new Date().toISOString().split('T')[0],
  expectedHatchDate: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
  temperature: '37.5',
  humidity: '55',
  eggSource: 'OWN_FARM',
  supplier: '',
  notes: '',
};

export default function IncubationPage() {
  const [batches, setBatches] = useState<IncubationBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<IncubationBatch | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [resultData, setResultData] = useState({ hatchedCount: '', failedCount: '', weakChicks: '', notes: '' });
  const [convertData, setConvertData] = useState({ batchNumber: '', type: 'BROILER', coopAssignment: '', notes: '' });
  const [sortKey, setSortKey] = useState<SortKey>('startDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [eggsHatchedThisMonth, setEggsHatchedThisMonth] = useState(0);
  const [nextBatchNumber, setNextBatchNumber] = useState('INC-001');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<IncubationBatch | null>(null);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/incubation?limit=100');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setBatches(data.data || []);
      if (data.stats) {
        setEggsHatchedThisMonth(data.stats.eggsHatchedThisMonth || 0);
        setNextBatchNumber(data.stats.nextBatchNumber || 'INC-001');
      }
    } catch {
      toast.error('Failed to load incubation batches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const generateBatchNumber = (dateStr: string) => {
    const d = new Date(dateStr);
    const datePart = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const prefix = `INC-${datePart}-`;
    const existingCount = batches.filter((b) => b.batchNumber.startsWith(prefix)).length;
    return `${prefix}${String(existingCount + 1).padStart(2, '0')}`;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedBatches = [...batches].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'batchNumber': cmp = a.batchNumber.localeCompare(b.batchNumber); break;
      case 'eggCount': cmp = a.eggCount - b.eggCount; break;
      case 'startDate': cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime(); break;
      case 'expectedHatchDate': cmp = new Date(a.expectedHatchDate).getTime() - new Date(b.expectedHatchDate).getTime(); break;
      case 'status': cmp = a.status.localeCompare(b.status); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        batchNumber: formData.batchNumber,
        eggCount: formData.eggCount,
        startDate: formData.startDate,
        expectedHatchDate: formData.expectedHatchDate,
        temperature: formData.temperature || null,
        humidity: formData.humidity || null,
        eggSource: formData.eggSource || null,
        supplier: formData.supplier || null,
        notes: formData.notes || null,
      };
      const res = await fetch('/api/incubation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create batch');
      }
      toast.success('Incubation batch started');
      setShowForm(false);
      fetchBatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/incubation/${selectedBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_results',
          hatchedCount: parseInt(resultData.hatchedCount || '0'),
          failedCount: parseInt(resultData.failedCount || '0'),
          weakChicks: parseInt(resultData.weakChicks || '0'),
          notes: resultData.notes || null,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update');
      }
      toast.success('Hatch results recorded');
      setShowResultsModal(false);
      setResultData({ hatchedCount: '', failedCount: '', weakChicks: '', notes: '' });
      fetchBatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record results');
    } finally {
      setIsSaving(false);
    }
  };

  const openConvertModal = (batch: IncubationBatch) => {
    setSelectedBatch(batch);
    setConvertData({
      batchNumber: batch.batchNumber,
      type: 'BROILER',
      coopAssignment: '',
      notes: `Hatched from ${batch.batchNumber}. ${batch.eggCount} eggs → ${batch.hatchedCount} hatched (${Math.round((batch.hatchedCount / batch.eggCount) * 100)}% rate).${batch.weakChicks > 0 ? ` ${batch.weakChicks} weak/deformed chicks noted.` : ''}`,
    });
    setShowConvertModal(true);
  };

  const handleConvertToFarmBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/incubation/${selectedBatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move_to_farm',
          batchNumber: convertData.batchNumber,
          type: convertData.type,
          coopAssignment: convertData.coopAssignment || null,
          notes: convertData.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to move to farm');
      }
      toast.success(`Farm batch ${convertData.batchNumber} created with ${selectedBatch.hatchedCount} chicks!`);
      setShowConvertModal(false);
      setSelectedBatch(null);
      fetchBatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create farm batch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBatch) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/incubation', {
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

  const getStatusLabel = (batch: IncubationBatch) => {
    if (batch.status === 'CLOSED') return 'Closed';
    if (batch.status === 'COMPLETED') return 'Completed';
    if (batch.hatchedCount > 0 || batch.failedCount > 0) return 'Completed';
    const daysLeft = Math.ceil((new Date(batch.expectedHatchDate).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) return 'Hatching today';
    if (daysLeft <= 2) return 'Hatching soon';
    return 'Incubating';
  };

  const getStatusBadgeClass = (label: string) => {
    if (label === 'Closed') return STATUS_COLORS.CLOSED;
    if (label === 'Completed') return STATUS_COLORS.COMPLETED;
    if (label.includes('Hatching')) return STATUS_COLORS.HATCHING;
    return STATUS_COLORS.INCUBATING;
  };

  // Stats
  const activeBatches = batches.filter((b) => b.status === 'INCUBATING' || (b.status !== 'CLOSED' && b.status !== 'COMPLETED' && b.hatchedCount === 0));
  const totalEggsIncubating = activeBatches.reduce((s, b) => s + b.eggCount, 0);
  const soonestHatch = activeBatches
    .filter((b) => new Date(b.expectedHatchDate).getTime() > Date.now())
    .sort((a, b) => new Date(a.expectedHatchDate).getTime() - new Date(b.expectedHatchDate).getTime())[0];
  const nextHatchDate = soonestHatch
    ? new Date(soonestHatch.expectedHatchDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
    : null;

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={11} className={sortKey === field ? 'text-green-700' : 'text-gray-300'} />
      </span>
    </th>
  );

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Incubation Management</h1>
            <p className="text-gray-600 mt-1">Track eggs from incubator to farm batch</p>
          </div>
          <button onClick={() => {
            const bn = generateBatchNumber(EMPTY_FORM.startDate);
            setFormData({ ...EMPTY_FORM, batchNumber: bn });
            setShowForm(true);
          }}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700">
            <Plus size={18} /> Start Incubation
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Incubation → Farm Batch workflow</p>
              <p>1. <strong>Start incubation</strong> — load eggs, record count, temperature, humidity, and source.</p>
              <p className="mt-0.5">2. <strong>Log hatch results</strong> — on hatch day, enter hatched, failed, and weak chick counts.</p>
              <p className="mt-0.5">3. <strong>Move to Farm</strong> — assign a coop and create a farm batch. This closes the incubation record.</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-500">Active Batches</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeBatches.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-500">Eggs Incubating</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{totalEggsIncubating.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-500">Hatched This Month</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{eggsHatchedThisMonth.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-500">Next Expected Hatch</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{nextHatchDate || '—'}</p>
            </div>
          </div>

          {/* Sortable Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center gap-2">
              <Egg size={20} className="text-green-700" />
              <h2 className="font-bold text-lg">Incubation Batches</h2>
              <span className="text-xs text-gray-400 ml-2">Click column headers to sort</span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : batches.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Egg size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No incubation batches yet</p>
                <p className="text-sm mt-1">Click &quot;Start Incubation&quot; to load your first batch of eggs</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <SortHeader label="Batch #" field="batchNumber" />
                      <SortHeader label="Eggs Set" field="eggCount" />
                      <SortHeader label="Start Date" field="startDate" />
                      <SortHeader label="Expected Hatch" field="expectedHatchDate" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Temp / Humidity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Egg Source</th>
                      <SortHeader label="Status" field="status" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Hatch Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedBatches.map((batch) => {
                      const statusLabel = getStatusLabel(batch);
                      const hatchRate = batch.hatchedCount > 0 ? Math.round((batch.hatchedCount / batch.eggCount) * 100) : null;
                      const daysLeft = Math.ceil((new Date(batch.expectedHatchDate).getTime() - Date.now()) / 86400000);

                      return (
                        <tr key={batch.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-semibold text-sm">{batch.batchNumber}</td>
                          <td className="px-4 py-3 text-sm font-medium">{batch.eggCount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">{new Date(batch.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(batch.expectedHatchDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {statusLabel === 'Incubating' && daysLeft > 0 && (
                              <span className="text-xs text-gray-400 ml-1">({daysLeft}d)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {batch.temperature || batch.humidity ? (
                              <span>{batch.temperature ? `${batch.temperature}°C` : '—'} / {batch.humidity ? `${batch.humidity}%` : '—'}</span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {batch.eggSource === 'PURCHASED' ? (
                              <span>Purchased{batch.supplier ? ` · ${batch.supplier}` : ''}</span>
                            ) : batch.eggSource === 'OWN_FARM' ? 'Own farm' : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs ${getStatusBadgeClass(statusLabel)}`}>{statusLabel}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {hatchRate !== null ? (
                              <div>
                                <span className="font-semibold text-green-700">{hatchRate}%</span>
                                <span className="text-xs text-gray-400 ml-1">({batch.hatchedCount}/{batch.eggCount})</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={() => { setSelectedBatch(batch); setShowViewModal(true); }}
                                className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded font-medium" title="View details">
                                <Eye size={14} />
                              </button>
                              {batch.status !== 'CLOSED' && (batch.hatchedCount === 0 && batch.failedCount === 0) && (
                                <button
                                  onClick={() => {
                                    setSelectedBatch(batch);
                                    setResultData({ hatchedCount: '', failedCount: '', weakChicks: '', notes: '' });
                                    setShowResultsModal(true);
                                  }}
                                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
                                  Log Results
                                </button>
                              )}
                              {(batch.status === 'COMPLETED' || (batch.hatchedCount > 0 && batch.status !== 'CLOSED')) && (
                                <button
                                  onClick={() => openConvertModal(batch)}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-green-700 text-white rounded font-medium hover:bg-green-800">
                                  <ArrowRight size={12} /> Move to Farm
                                </button>
                              )}
                              {batch.status === 'CLOSED' && (
                                <span className="text-xs text-gray-400 italic px-2 py-1">Moved to farm</span>
                              )}
                              <button
                                onClick={() => { setDeletingBatch(batch); setShowDeleteModal(true); }}
                                className="text-xs p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                                <Trash2 size={14} />
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
        </div>

        {/* START INCUBATION MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-200 flex justify-between sticky top-0 bg-white z-10">
                <h2 className="font-bold text-xl">Start New Incubation</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Set Date *</label>
                    <input type="date" required value={formData.startDate}
                      onChange={(e) => {
                        const d = new Date(e.target.value); d.setDate(d.getDate() + 21);
                        const newBn = generateBatchNumber(e.target.value);
                        setFormData({ ...formData, startDate: e.target.value, expectedHatchDate: d.toISOString().split('T')[0], batchNumber: newBn });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Number</label>
                    <input type="text" readOnly value={formData.batchNumber}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 font-mono cursor-not-allowed" />
                    <p className="text-xs text-gray-400 mt-0.5">Auto-generated from set date</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Number of Eggs *</label>
                    <input type="number" required min="1" value={formData.eggCount}
                      onChange={(e) => setFormData({ ...formData, eggCount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 3000" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Expected Hatch *</label>
                    <input type="date" required value={formData.expectedHatchDate}
                      onChange={(e) => setFormData({ ...formData, expectedHatchDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <p className="text-xs text-gray-400 mt-0.5">Auto-set 21 days from set date</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Temperature (°C)</label>
                    <input type="number" step="0.1" value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="37.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Humidity (%)</label>
                    <input type="number" step="0.1" value={formData.humidity}
                      onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="55" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Egg Source</label>
                    <select value={formData.eggSource}
                      onChange={(e) => setFormData({ ...formData, eggSource: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {EGG_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  {formData.eggSource === 'PURCHASED' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier Name</label>
                      <input type="text" value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Kenchic" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="e.g. Breed: Cobb 500 | Incubator: #2 | Egg condition: clean, uniform size" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSaving ? 'Starting...' : 'Start Incubation'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW DETAILS MODAL */}
        {showViewModal && selectedBatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b border-gray-200 flex justify-between">
                <div>
                  <h2 className="font-bold text-xl">{selectedBatch.batchNumber}</h2>
                  <Badge className={`text-xs mt-1 ${getStatusBadgeClass(getStatusLabel(selectedBatch))}`}>{getStatusLabel(selectedBatch)}</Badge>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-gray-500">Eggs set:</span> <span className="font-semibold">{selectedBatch.eggCount.toLocaleString()}</span></div>
                  <div><span className="text-gray-500">Start:</span> <span className="font-semibold">{new Date(selectedBatch.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                  <div><span className="text-gray-500">Expected hatch:</span> <span className="font-semibold">{new Date(selectedBatch.expectedHatchDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                  {selectedBatch.temperature && <div><span className="text-gray-500">Temperature:</span> <span className="font-semibold">{Number(selectedBatch.temperature)}°C</span></div>}
                  {selectedBatch.humidity && <div><span className="text-gray-500">Humidity:</span> <span className="font-semibold">{Number(selectedBatch.humidity)}%</span></div>}
                  <div><span className="text-gray-500">Source:</span> <span className="font-semibold">{selectedBatch.eggSource === 'PURCHASED' ? `Purchased${selectedBatch.supplier ? ` (${selectedBatch.supplier})` : ''}` : selectedBatch.eggSource === 'OWN_FARM' ? 'Own farm' : '—'}</span></div>
                </div>
                {selectedBatch.hatchedCount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="font-semibold text-green-800 mb-1">Hatch Results</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><p className="text-lg font-bold text-green-700">{selectedBatch.hatchedCount}</p><p className="text-xs text-gray-500">Hatched</p></div>
                      <div><p className="text-lg font-bold text-red-600">{selectedBatch.failedCount}</p><p className="text-xs text-gray-500">Failed</p></div>
                      <div><p className="text-lg font-bold text-amber-600">{selectedBatch.weakChicks}</p><p className="text-xs text-gray-500">Weak</p></div>
                    </div>
                    <p className="text-center mt-1 text-sm font-semibold text-green-800">{Math.round((selectedBatch.hatchedCount / selectedBatch.eggCount) * 100)}% hatch rate</p>
                  </div>
                )}
                {selectedBatch.coopAssignment && (
                  <div><span className="text-gray-500">Coop/House:</span> <span className="font-semibold">{selectedBatch.coopAssignment}</span></div>
                )}
                {selectedBatch.transferDate && (
                  <div><span className="text-gray-500">Transferred:</span> <span className="font-semibold">{new Date(selectedBatch.transferDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                )}
                {selectedBatch.notes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-gray-700">{selectedBatch.notes}</p>
                  </div>
                )}
              </div>
              <div className="p-5 border-t flex gap-3">
                {selectedBatch.status !== 'CLOSED' && selectedBatch.hatchedCount === 0 && (
                  <button onClick={() => { setShowViewModal(false); setResultData({ hatchedCount: '', failedCount: '', weakChicks: '', notes: '' }); setShowResultsModal(true); }}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Log Results</button>
                )}
                {(selectedBatch.status === 'COMPLETED' || (selectedBatch.hatchedCount > 0 && selectedBatch.status !== 'CLOSED')) && (
                  <button onClick={() => { setShowViewModal(false); openConvertModal(selectedBatch); }}
                    className="flex-1 py-2.5 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 flex items-center justify-center gap-2">
                    <ArrowRight size={16} /> Move to Farm
                  </button>
                )}
                <button onClick={() => setShowViewModal(false)}
                  className="py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* LOG HATCH RESULTS MODAL */}
        {showResultsModal && selectedBatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b border-gray-200 flex justify-between">
                <div>
                  <h2 className="font-bold text-xl">Log Hatch Results</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedBatch.batchNumber} &middot; {selectedBatch.eggCount.toLocaleString()} eggs</p>
                </div>
                <button onClick={() => setShowResultsModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleRecordResults} className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hatched *</label>
                    <input type="number" required min="0" value={resultData.hatchedCount}
                      onChange={(e) => setResultData({ ...resultData, hatchedCount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-green-700" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Failed *</label>
                    <input type="number" required min="0" value={resultData.failedCount}
                      onChange={(e) => setResultData({ ...resultData, failedCount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-red-600" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Weak / Deformed</label>
                    <input type="number" min="0" value={resultData.weakChicks}
                      onChange={(e) => setResultData({ ...resultData, weakChicks: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-amber-600" placeholder="0" />
                  </div>
                </div>
                {/* Live summary */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-600">Total eggs set</span><span className="font-bold">{selectedBatch.eggCount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-green-700">Hatched</span><span className="font-bold text-green-700">{resultData.hatchedCount || 0}</span></div>
                  <div className="flex justify-between"><span className="text-red-600">Failed</span><span className="font-bold text-red-600">{resultData.failedCount || 0}</span></div>
                  {parseInt(resultData.weakChicks || '0') > 0 && (
                    <div className="flex justify-between"><span className="text-amber-600">Weak / Deformed</span><span className="font-bold text-amber-600">{resultData.weakChicks}</span></div>
                  )}
                  <div className="flex justify-between border-t pt-1"><span className="text-gray-600">Hatch rate</span>
                    <span className="font-bold">{resultData.hatchedCount ? `${Math.round((parseInt(resultData.hatchedCount) / selectedBatch.eggCount) * 100)}%` : '—'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes on Hatch Quality</label>
                  <textarea rows={2} value={resultData.notes}
                    onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="e.g. Good overall quality, 3 chicks with splayed legs, most active and healthy" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Results'}
                  </button>
                  <button type="button" onClick={() => setShowResultsModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MOVE TO FARM MODAL */}
        {showConvertModal && selectedBatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b border-gray-200 flex justify-between">
                <div>
                  <h2 className="font-bold text-xl">Move Chicks to Farm</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedBatch.hatchedCount.toLocaleString()} chicks from {selectedBatch.batchNumber}</p>
                </div>
                <button onClick={() => setShowConvertModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleConvertToFarmBatch} className="p-5 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p>This will create a new Farm Batch with <strong>{selectedBatch.hatchedCount.toLocaleString()} chicks</strong> and <strong>close</strong> this incubation record. This action cannot be undone.</p>
                  </div>
                </div>

                {selectedBatch.weakChicks > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800"><strong>{selectedBatch.weakChicks}</strong> weak/deformed chicks were noted. Consider separating them from the healthy flock.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Farm Batch Number *</label>
                  <input type="text" required value={convertData.batchNumber}
                    onChange={(e) => setConvertData({ ...convertData, batchNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Batch Type *</label>
                    <select value={convertData.type} onChange={(e) => setConvertData({ ...convertData, type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="BROILER">Broiler — meat (6-8 wks)</option>
                      <option value="LAYER">Layer — eggs (16-18 wks)</option>
                      <option value="KIENYEJI">Kienyeji — free-range</option>
                      <option value="MIXED">Mixed — pending ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Coop / House</label>
                    <input type="text" value={convertData.coopAssignment}
                      onChange={(e) => setConvertData({ ...convertData, coopAssignment: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Brooder House A" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea rows={3} value={convertData.notes}
                    onChange={(e) => setConvertData({ ...convertData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="e.g. Hatch observations, chick quality, housing assignment..." />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <ArrowRight size={16} /> {isSaving ? 'Creating...' : 'Create Farm Batch & Close'}
                  </button>
                  <button type="button" onClick={() => setShowConvertModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteModal && deletingBatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Delete Incubation Batch?</h3>
                <p className="text-gray-600 text-sm">
                  Are you sure you want to delete <strong>{deletingBatch.batchNumber}</strong> ({deletingBatch.eggCount.toLocaleString()} eggs)?
                  This will permanently remove this incubation record and its temperature/humidity logs.
                </p>
                <p className="text-red-600 text-xs mt-2 font-medium">This action cannot be undone.</p>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleDelete} disabled={isSaving}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
                    {isSaving ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button onClick={() => { setShowDeleteModal(false); setDeletingBatch(null); }}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
