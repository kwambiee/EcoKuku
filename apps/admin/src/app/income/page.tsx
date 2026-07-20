'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import { Plus, TrendingUp, Pencil, X, Banknote } from 'lucide-react';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'EGGS_SALE', label: 'Egg Sales' },
  { value: 'LIVE_BIRDS_SALE', label: 'Live Bird Sales' },
  { value: 'CHICKS_SALE', label: 'Chick Sales' },
  { value: 'MANURE_SALE', label: 'Manure Sales' },
  { value: 'BATCH_ORDER_DEPOSIT', label: 'Batch Order Deposit' },
  { value: 'OTHER', label: 'Other Income' },
];

const CATEGORY_COLORS: Record<string, string> = {
  EGGS_SALE: 'bg-yellow-100 text-yellow-800',
  LIVE_BIRDS_SALE: 'bg-orange-100 text-orange-800',
  CHICKS_SALE: 'bg-amber-100 text-amber-800',
  MANURE_SALE: 'bg-green-100 text-green-800',
  BATCH_ORDER_DEPOSIT: 'bg-blue-100 text-blue-800',
  OTHER: 'bg-gray-100 text-gray-700',
};

const PAYMENT_METHODS = ['MPESA', 'CASH', 'BANK_TRANSFER'];

interface IncomeRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  buyerName?: string;
  receiptRef?: string;
  notes?: string;
}

interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
}

const emptyForm = {
  category: '',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  paymentMethod: 'MPESA',
  buyerName: '',
  receiptRef: '',
  notes: '',
};

export default function IncomePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/income?year=${year}&month=${month}`);
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setByCategory(data.byCategory || []);
    } catch {
      toast.error('Failed to load income data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year, month]);

  const openAdd = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (r: IncomeRecord) => {
    setEditingRecord(r);
    setForm({
      category: r.category,
      description: r.description,
      amount: String(r.amount),
      date: new Date(r.date).toISOString().split('T')[0],
      paymentMethod: r.paymentMethod || 'MPESA',
      buyerName: r.buyerName || '',
      receiptRef: r.receiptRef || '',
      notes: r.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const isEdit = !!editingRecord;
      const res = await fetch('/api/income', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { incomeId: editingRecord!.id, ...form } : form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(isEdit ? 'Income record updated' : 'Income recorded');
      setShowForm(false);
      setEditingRecord(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (r: IncomeRecord) => {
    toast(`Delete KSh ${r.amount.toLocaleString()} — ${categoryLabel(r.category)}?`, {
      description: r.description,
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const res = await fetch('/api/income', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ incomeId: r.id }),
            });
            if (!res.ok) throw new Error();
            toast.success('Income record deleted');
            fetchData();
          } catch {
            toast.error('Failed to delete');
          }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const categoryLabel = (value: string) =>
    CATEGORIES.find((c) => c.value === value)?.label ?? value;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={24} className="text-green-800" />
              <h1 className="text-2xl font-bold">Income</h1>
            </div>
            <p className="text-gray-500 text-sm mt-1">Log and track all farm income — sales, deposits, and other revenue</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            <Plus size={15} /> Record income
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Month/Year filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4 lg:col-span-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total income — {MONTHS[month - 1]} {year}</p>
              <p className="text-3xl font-bold mt-1 text-green-700">KSh {total.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">{records.length} record{records.length !== 1 ? 's' : ''}</p>
            </div>
            {byCategory.slice(0, 2).map((c) => (
              <div key={c.category} className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 font-medium">{categoryLabel(c.category)}</p>
                <p className="text-2xl font-bold mt-1">KSh {c.total.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.count} entries</p>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {byCategory.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-bold text-base mb-4">Breakdown by category</h2>
              <div className="space-y-3">
                {byCategory
                  .sort((a, b) => b.total - a.total)
                  .map((c) => {
                    const pct = total > 0 ? (c.total / total) * 100 : 0;
                    return (
                      <div key={c.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[c.category] || 'bg-gray-100 text-gray-700'}`}>
                            {categoryLabel(c.category)}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            KSh {c.total.toLocaleString()} <span className="text-gray-400 font-normal text-xs">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Records table */}
          <div className="bg-white rounded-xl border">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Income records</h2>
              <button onClick={openAdd}
                className="text-sm text-green-700 font-medium hover:underline flex items-center gap-1">
                <Plus size={14} /> Add record
              </button>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center">
                <Banknote size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No income recorded for {MONTHS[month - 1]} {year}</p>
                <p className="text-gray-400 text-sm mt-1">Record egg sales, bird sales, deposits and any other farm income.</p>
                <button onClick={openAdd}
                  className="mt-4 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  Record first income
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Buyer</th>
                      <th className="px-4 py-3 text-left">Payment</th>
                      <th className="px-4 py-3 text-right">Amount (KSh)</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 group">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(r.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[r.category] || 'bg-gray-100 text-gray-700'}`}>
                            {categoryLabel(r.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                          <span>{r.description}</span>
                          {r.notes && <span className="block text-xs text-gray-400 mt-0.5">{r.notes}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.buyerName || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          {r.paymentMethod ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                              {r.paymentMethod.replace('_', ' ')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-green-700">
                          {r.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(r)} title="Edit"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(r)} title="Delete"
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-green-50">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-700">Total</td>
                      <td className="px-4 py-3 text-right text-base font-bold text-green-700">
                        KSh {total.toLocaleString()}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ADD / EDIT MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
                <h2 className="font-bold text-xl">{editingRecord ? 'Edit Income Record' : 'Record Income'}</h2>
                <button onClick={() => { setShowForm(false); setEditingRecord(null); }}
                  className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                    <select required value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select category...</option>
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                  <input type="text" required value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. 30 trays eggs sold to Nakumatt, 50 broilers to Mama Njeri..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (KSh) *</label>
                    <input type="number" step="0.01" required value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Payment method</label>
                    <select value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Buyer name</label>
                    <input type="text" value={form.buyerName}
                      onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Mama Njeri" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Receipt / Ref no.</label>
                    <input type="text" value={form.receiptRef}
                      onChange={(e) => setForm({ ...form, receiptRef: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="M-PESA ref or receipt no." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Any additional notes..." />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSaving ? 'Saving...' : editingRecord ? 'Save Changes' : 'Record Income'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingRecord(null); }}
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
