'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import { Plus, Trash2, Receipt, Edit2 } from 'lucide-react';

interface Expense {
  id: string; date: string; category: string;
  description: string; amount: number; vendor?: string; receiptRef?: string; notes?: string;
  sourceType?: string; sourceId?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  FEED_PURCHASE: 'Feed Purchase',
  BATCH_CREATION: 'Batch Purchase',
  VACCINATION: 'Vaccination',
};

const EXPENSE_CATEGORIES = [
  'FEED', 'MEDICINE_VACCINE', 'CHICKS_PURCHASE', 'EQUIPMENT',
  'LABOUR', 'UTILITIES', 'TRANSPORT', 'VETERINARY', 'OTHER',
];
const CATEGORY_LABELS: Record<string, string> = {
  FEED: 'Feed', MEDICINE_VACCINE: 'Medicine & Vaccines', CHICKS_PURCHASE: 'Chicks Purchase',
  EQUIPMENT: 'Equipment', LABOUR: 'Labour', UTILITIES: 'Utilities',
  TRANSPORT: 'Transport', VETERINARY: 'Veterinary', OTHER: 'Other',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const EMPTY_FORM = { date: new Date().toISOString().split('T')[0], category: 'FEED', description: '', amount: '', vendor: '', receiptRef: '', notes: '' };
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/expenses?${params}`);
      const data = await res.json();
      setExpenses(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to load expenses'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, [categoryFilter]);

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      date: expense.date.split('T')[0],
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      vendor: expense.vendor || '',
      receiptRef: expense.receiptRef || '',
      notes: expense.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const res = editingExpense
        ? await fetch('/api/expenses', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expenseId: editingExpense.id, ...payload }),
          })
        : await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      toast.success(editingExpense ? 'Expense updated' : 'Expense recorded');
      setForm(EMPTY_FORM);
      setEditingExpense(null);
      setShowForm(false);
      fetchExpenses();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSaving(false); }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense record?')) return;
    const res = await fetch('/api/expenses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseId: id }),
    });
    if (res.ok) { toast.success('Deleted'); fetchExpenses(); }
    else toast.error('Failed to delete');
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expense Records</h1>
            <p className="text-gray-600 mt-1">Track all farm costs for accurate profit calculations</p>
          </div>
          <button onClick={() => { setEditingExpense(null); setForm(EMPTY_FORM); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">
            <Plus size={18} /> Record Expense
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">KSh {Math.round(total).toLocaleString()}</p>
            </div>
            {Object.entries(
              expenses.reduce((acc, e) => {
                acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
                return acc;
              }, {} as Record<string, number>)
            ).slice(0, 3).map(([cat, amt]) => (
              <div key={cat} className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">{CATEGORY_LABELS[cat] || cat}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">KSh {Math.round(amt).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategoryFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!categoryFilter ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              All
            </button>
            {EXPENSE_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${categoryFilter === c ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex items-center gap-2">
              <Receipt size={18} className="text-red-600" />
              <h2 className="font-bold">All Expenses ({expenses.length})</h2>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : expenses.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Receipt size={40} className="mx-auto mb-3 text-gray-300" />
                <p>No expenses recorded yet</p>
                <p className="text-sm mt-1">Add expenses to calculate true farm profitability</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Vendor</th>
                      <th className="px-4 py-3 text-left">Receipt</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{new Date(e.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-full">{CATEGORY_LABELS[e.category] || e.category}</span>
                          {e.sourceType && (
                            <span className="ml-1 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">Auto</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {e.description}
                          {e.sourceType && (
                            <span className="block text-xs text-blue-500 mt-0.5">
                              via {SOURCE_LABELS[e.sourceType] || e.sourceType}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{e.vendor || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{e.receiptRef || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-sm text-red-700">KSh {Number(e.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => openEdit(e)} className="p-1 text-blue-500 hover:text-blue-700">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => deleteExpense(e.id)} className="p-1 text-red-400 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-700">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">KSh {Math.round(total).toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-5 border-b border-gray-200 flex justify-between">
                <h2 className="font-bold text-xl">{editingExpense ? 'Edit Expense' : 'Record Expense'}</h2>
                <button onClick={() => { setShowForm(false); setEditingExpense(null); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                  <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Layer mash 10 bags from Unga Feeds" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (KSh) *</label>
                    <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vendor</label>
                    <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Supplier name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Receipt No.</label>
                    <input type="text" value={form.receiptRef} onChange={(e) => setForm({ ...form, receiptRef: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="RCPT-001" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                    <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
                    {isSaving ? 'Saving...' : editingExpense ? 'Save Changes' : 'Record Expense'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingExpense(null); setForm(EMPTY_FORM); }}
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
