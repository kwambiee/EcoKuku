'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import {
  Plus, Trash2, Receipt, Edit2, TrendingUp, TrendingDown,
  Zap, ClipboardList, ChevronDown, ChevronUp, ImageIcon, X,
  Target, Pencil,
} from 'lucide-react';

interface Expense {
  id: string; date: string; category: string; description: string;
  amount: number; paymentMethod?: string; vendor?: string; receiptRef?: string;
  receiptImage?: string; notes?: string; sourceType?: string; sourceId?: string;
  batchId?: string;
  batch?: { id: string; batchNumber: string; type: string } | null;
}

interface Stats {
  thisMonthTotal: number; lastMonthTotal: number; pctChange: number | null;
  largestCategory: { category: string; amount: number } | null;
}

interface Budget {
  id: string; month: number; year: number; amount: number;
}

interface ActiveBatch { id: string; batchNumber: string; type: string; }

const EXPENSE_CATEGORIES = [
  { value: 'FEED', label: 'Feed' },
  { value: 'CHICKS_PURCHASE', label: 'Chick Purchase' },
  { value: 'MEDICINE_VACCINE', label: 'Vaccines & Medicine' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'TRANSPORT', label: 'Delivery / Transport' },
  { value: 'LABOUR', label: 'Labour' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'VETERINARY', label: 'Veterinary' },
  { value: 'OTHER', label: 'Other' },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]));

const PAYMENT_METHODS = [
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

const SOURCE_LABELS: Record<string, string> = {
  FEED_PURCHASE: 'Feed Purchase',
  BATCH_CREATION: 'Batch Purchase',
  VACCINATION: 'Vaccination',
  DELIVERY: 'Delivery',
};

const CAT_COLORS: Record<string, string> = {
  FEED: 'bg-green-50 text-green-700',
  CHICKS_PURCHASE: 'bg-yellow-50 text-yellow-700',
  MEDICINE_VACCINE: 'bg-blue-50 text-blue-700',
  PACKAGING: 'bg-purple-50 text-purple-700',
  TRANSPORT: 'bg-indigo-50 text-indigo-700',
  LABOUR: 'bg-orange-50 text-orange-700',
  EQUIPMENT: 'bg-gray-100 text-gray-700',
  UTILITIES: 'bg-cyan-50 text-cyan-700',
  VETERINARY: 'bg-teal-50 text-teal-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

const fmt = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  category: 'FEED', description: '', amount: '',
  paymentMethod: 'MPESA', vendor: '', receiptRef: '', notes: '', batchId: '',
};

export default function ExpensesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [byCategoryThisMonth, setByCategoryThisMonth] = useState<{ category: string; amount: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [budget, setBudget] = useState<Budget | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [showAutoSection, setShowAutoSection] = useState(true);
  const [showManualSection, setShowManualSection] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (categoryFilter) params.set('category', categoryFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      const res = await fetch(`/api/expenses?${params}`);
      const data = await res.json();
      setExpenses(data.data || []);
      setTotal(data.total || 0);
      setStats(data.stats || null);
      setByCategoryThisMonth(data.byCategoryThisMonth || []);
    } catch { toast.error('Failed to load expenses'); }
    finally { setIsLoading(false); }
  };

  const fetchActiveBatches = async () => {
    try {
      const res = await fetch('/api/batches?status=ACTIVE&limit=50');
      const data = await res.json();
      setActiveBatches(data.data || []);
    } catch { /* */ }
  };

  const fetchBudget = async () => {
    try {
      const res = await fetch('/api/expenses/budget');
      const data = await res.json();
      setBudget(data.budget ? { ...data.budget, amount: Number(data.budget.amount) } : null);
    } catch { /* */ }
  };

  const saveBudget = async () => {
    if (!budgetInput || isNaN(parseFloat(budgetInput)) || parseFloat(budgetInput) <= 0) {
      toast.error('Enter a valid budget amount'); return;
    }
    setIsSavingBudget(true);
    try {
      const res = await fetch('/api/expenses/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(budgetInput) }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setBudget({ ...data.budget, amount: Number(data.budget.amount) });
      setShowBudgetModal(false);
      setBudgetInput('');
      toast.success('Budget saved');
    } catch { toast.error('Failed to save budget'); }
    finally { setIsSavingBudget(false); }
  };

  const clearBudget = async () => {
    if (!confirm('Remove budget for this month?')) return;
    await fetch('/api/expenses/budget', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    setBudget(null);
    toast.success('Budget cleared');
  };

  useEffect(() => {
    if (session?.user) { fetchExpenses(); fetchActiveBatches(); fetchBudget(); }
  }, [session, categoryFilter, sourceFilter]);

  const openCreate = () => {
    setEditingExpense(null);
    setForm(EMPTY_FORM);
    setReceiptFile(null); setReceiptPreview(null);
    setShowForm(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      date: expense.date.split('T')[0],
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      paymentMethod: expense.paymentMethod || 'MPESA',
      vendor: expense.vendor || '',
      receiptRef: expense.receiptRef || '',
      notes: expense.notes || '',
      batchId: expense.batchId || '',
    });
    setReceiptPreview(expense.receiptImage || null);
    setReceiptFile(null);
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setReceiptFile(f);
    setReceiptPreview(URL.createObjectURL(f));
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receiptFile) return editingExpense?.receiptImage || null;
    setIsUploading(true);
    try {
      const fd = new FormData(); fd.append('file', receiptFile);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.url as string;
    } catch { toast.error('Receipt upload failed'); return null; }
    finally { setIsUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      toast.error('Enter a valid amount'); return;
    }
    setIsSaving(true);
    try {
      const receiptImageUrl = await uploadReceipt();
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        receiptImage: receiptImageUrl,
        batchId: form.batchId || null,
        paymentMethod: form.paymentMethod || null,
      };
      const res = editingExpense
        ? await fetch('/api/expenses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenseId: editingExpense.id, ...payload }) })
        : await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
      toast.success(editingExpense ? 'Expense updated' : 'Expense recorded');
      setShowForm(false); setEditingExpense(null); setForm(EMPTY_FORM);
      setReceiptFile(null); setReceiptPreview(null);
      fetchExpenses();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSaving(false); }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense record?')) return;
    const res = await fetch('/api/expenses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenseId: id }) });
    if (res.ok) { toast.success('Deleted'); fetchExpenses(); }
    else toast.error('Failed to delete');
  };

  const autoExpenses = expenses.filter((e) => e.sourceType);
  const manualExpenses = expenses.filter((e) => !e.sourceType);

  if (authStatus === 'loading') return <div className="p-8">Loading...</div>;

  const ExpenseRow = ({ e }: { e: Expense }) => (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        {new Date(e.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLORS[e.category] || 'bg-gray-100 text-gray-600'}`}>
          {CAT_LABEL[e.category] || e.category}
        </span>
        {e.sourceType && (
          <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
            Auto
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px]">
        <p className="truncate">{e.description}</p>
        {e.sourceType && <p className="text-[10px] text-blue-500">via {SOURCE_LABELS[e.sourceType] || e.sourceType}</p>}
        {e.batch && <p className="text-[10px] text-gray-400">Batch: {e.batch.batchNumber}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{e.vendor || '—'}</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {e.paymentMethod ? (
          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
            {PAYMENT_METHODS.find((p) => p.value === e.paymentMethod)?.label || e.paymentMethod}
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {e.receiptRef && <span className="font-mono">{e.receiptRef}</span>}
        {e.receiptImage && (
          <a href={e.receiptImage}
            download={`receipt-${e.receiptRef || e.id}.jpg`}
            className="ml-1 text-blue-500 hover:text-blue-700 inline-flex items-center gap-0.5">
            <ImageIcon size={11} /> Download
          </a>
        )}
        {!e.receiptRef && !e.receiptImage && '—'}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-sm text-red-700 whitespace-nowrap">
        {fmt(Number(e.amount))}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50">
            <Edit2 size={13} />
          </button>
          <button onClick={() => deleteExpense(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );

  const TableHead = () => (
    <thead className="bg-gray-50 border-b">
      <tr>
        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
      </tr>
    </thead>
  );

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Expense Records</h1>
            <p className="text-gray-500 text-sm mt-1">Track all farm costs for accurate profit calculations</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 text-sm">
            <Plus size={16} /> Record Expense
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">This Month</p>
              <p className="text-2xl font-bold text-red-600">{stats ? fmt(stats.thisMonthTotal) : '—'}</p>
              {stats?.pctChange !== null && stats?.pctChange !== undefined && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${stats.pctChange <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.pctChange > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {stats.pctChange > 0 ? '+' : ''}{stats.pctChange}% vs last month
                </div>
              )}
              {stats?.pctChange === null && stats?.lastMonthTotal === 0 && (
                <p className="text-xs text-gray-400 mt-1">No data last month</p>
              )}
            </div>

            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Last Month</p>
              <p className="text-2xl font-bold text-gray-700">{stats ? fmt(stats.lastMonthTotal) : '—'}</p>
              <p className="text-xs text-gray-400 mt-1">Previous month total</p>
            </div>

            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Largest Category</p>
              {stats?.largestCategory ? (
                <>
                  <p className="text-lg font-bold text-gray-900">{CAT_LABEL[stats.largestCategory.category] || stats.largestCategory.category}</p>
                  <p className="text-sm text-red-600 font-semibold mt-0.5">{fmt(stats.largestCategory.amount)}</p>
                  <p className="text-[10px] text-gray-400">this month</p>
                </>
              ) : <p className="text-lg font-bold text-gray-400">—</p>}
            </div>

            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between mb-1">
                <p className="text-xs text-gray-500 uppercase">Budget Remaining</p>
                <button onClick={() => { setBudgetInput(budget ? String(budget.amount) : ''); setShowBudgetModal(true); }}
                  className="text-gray-400 hover:text-green-700 p-0.5 rounded" title={budget ? 'Edit budget' : 'Set budget'}>
                  {budget ? <Pencil size={12} /> : <Target size={12} />}
                </button>
              </div>
              {budget && stats ? (() => {
                const remaining = budget.amount - stats.thisMonthTotal;
                const pct = Math.min(100, Math.round((stats.thisMonthTotal / budget.amount) * 100));
                const isOver = remaining < 0;
                const isWarning = !isOver && pct >= 80;
                return (
                  <>
                    <p className={`text-2xl font-bold ${isOver ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-700'}`}>
                      {isOver ? `−${fmt(Math.abs(remaining))}` : fmt(remaining)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">of {fmt(budget.amount)} budget</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {pct}% used{isOver ? ' — over budget' : isWarning ? ' — almost at limit' : ''}
                    </p>
                    <button onClick={clearBudget} className="text-[10px] text-gray-300 hover:text-red-400 mt-1">clear</button>
                  </>
                );
              })() : (
                <>
                  <p className="text-lg font-bold text-gray-400">Not set</p>
                  <button onClick={() => { setBudgetInput(''); setShowBudgetModal(true); }}
                    className="mt-1 text-xs text-green-700 font-medium hover:text-green-900 flex items-center gap-1">
                    <Target size={11} /> Set monthly budget
                  </button>
                </>
              )}
            </div>
          </div>

          {/* This month by category */}
          {byCategoryThisMonth.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">This Month by Category</p>
              <div className="flex flex-wrap gap-2">
                {byCategoryThisMonth.map((c) => (
                  <div key={c.category} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${CAT_COLORS[c.category] || 'bg-gray-100 text-gray-600'}`}>
                    <span className="font-medium">{CAT_LABEL[c.category] || c.category}</span>
                    <span className="font-bold">{fmt(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setCategoryFilter('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!categoryFilter ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                All
              </button>
              {EXPENSE_CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCategoryFilter(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${categoryFilter === c.value ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-1">
              {['', 'auto', 'manual'].map((s) => (
                <button key={s} onClick={() => setSourceFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${sourceFilter === s ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s === '' ? 'All types' : s === 'auto' ? '⚡ Auto-captured' : '✏ Manual'}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-captured section */}
          {(sourceFilter === '' || sourceFilter === 'auto') && autoExpenses.length > 0 && (
            <div className="bg-white rounded-xl border">
              <button onClick={() => setShowAutoSection(!showAutoSection)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Zap size={14} className="text-blue-700" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Auto-Captured Expenses</p>
                    <p className="text-xs text-gray-400">
                      {autoExpenses.length} records — auto-logged from Feed purchases, Batch acquisitions, Vaccinations
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-700 ml-2">
                    {fmt(autoExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                  </span>
                </div>
                {showAutoSection ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>
              {showAutoSection && (
                <div className="border-t">
                  <div className="px-4 py-2 bg-blue-50 border-b">
                    <p className="text-xs text-blue-700">
                      These entries are created automatically when you record a feed purchase, add a new batch, or log a vaccination with medicine cost.
                      You can edit or delete them if needed.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                      <TableHead />
                      <tbody className="divide-y divide-gray-100">
                        {autoExpenses.map((e) => <ExpenseRow key={e.id} e={e} />)}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t">
                        <tr>
                          <td colSpan={6} className="px-4 py-2.5 text-xs font-bold text-gray-600">Auto-captured total</td>
                          <td className="px-4 py-2.5 text-right text-sm font-bold text-red-700">
                            {fmt(autoExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual expenses section */}
          {(sourceFilter === '' || sourceFilter === 'manual') && (
            <div className="bg-white rounded-xl border">
              <button onClick={() => setShowManualSection(!showManualSection)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ClipboardList size={14} className="text-gray-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Manual Expenses</p>
                    <p className="text-xs text-gray-400">
                      {manualExpenses.length} records — repair costs, labour, utilities, and other items not captured automatically
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-700 ml-2">
                    {fmt(manualExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                  </span>
                </div>
                {showManualSection ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>
              {showManualSection && (
                <div className="border-t">
                  {manualExpenses.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <Receipt size={36} className="mx-auto mb-2 text-gray-300" />
                      <p className="font-medium text-sm">No manual expenses yet</p>
                      <p className="text-xs mt-1">Use "Record Expense" to add repair costs, labour, or anything not captured automatically</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max">
                        <TableHead />
                        <tbody className="divide-y divide-gray-100">
                          {manualExpenses.map((e) => <ExpenseRow key={e.id} e={e} />)}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t">
                          <tr>
                            <td colSpan={6} className="px-4 py-2.5 text-xs font-bold text-gray-600">Manual total</td>
                            <td className="px-4 py-2.5 text-right text-sm font-bold text-red-700">
                              {fmt(manualExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isLoading && <div className="p-8 text-center text-gray-400">Loading expenses...</div>}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
              <div className="p-5 border-b flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-lg">{editingExpense ? 'Edit Expense' : 'Record Expense'}</h2>
                  {editingExpense?.sourceType && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      Auto-captured via {SOURCE_LABELS[editingExpense.sourceType] || editingExpense.sourceType} — edits override the auto value
                    </p>
                  )}
                </div>
                <button onClick={() => { setShowForm(false); setEditingExpense(null); setForm(EMPTY_FORM); setReceiptFile(null); setReceiptPreview(null); }}
                  className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none">
                      {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description *</label>
                  <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                    placeholder="e.g. Layer mash 10 bags from Unga Feeds" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (KSh) *</label>
                    <input type="number" step="0.01" min="0" required value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                      placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                    <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none">
                      <option value="">— Select —</option>
                      {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier / Vendor</label>
                    <input type="text" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                      placeholder="Supplier name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt / Invoice No.</label>
                    <input type="text" value={form.receiptRef} onChange={(e) => setForm({ ...form, receiptRef: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                      placeholder="RCPT-001" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Link to Batch</label>
                    <select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none">
                      <option value="">— None —</option>
                      {activeBatches.map((b) => (
                        <option key={b.id} value={b.id}>{b.batchNumber} ({b.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                    <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                      placeholder="Optional notes" />
                  </div>
                </div>

                {/* Receipt Photo Upload */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Receipt Photo (optional)</label>
                  {receiptPreview ? (
                    <div className="relative inline-block">
                      <img src={receiptPreview} alt="Receipt" className="h-24 rounded-lg border object-cover" />
                      <button type="button" onClick={() => { setReceiptFile(null); setReceiptPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-red-400 transition-colors">
                      <ImageIcon size={20} className="mx-auto mb-1 text-gray-400" />
                      <p className="text-xs text-gray-500">Click to upload receipt photo (JPEG/PNG, max 5MB)</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={isSaving || isUploading}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 text-sm">
                    {isSaving || isUploading ? 'Saving...' : editingExpense ? 'Save Changes' : 'Record Expense'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingExpense(null); setForm(EMPTY_FORM); setReceiptFile(null); setReceiptPreview(null); }}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Budget Modal */}
        {showBudgetModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-green-700" />
                  <h2 className="font-bold text-lg">
                    {budget ? 'Edit' : 'Set'} Monthly Budget
                  </h2>
                </div>
                <button onClick={() => setShowBudgetModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Set a spending target for <strong>
                    {new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}
                  </strong>. You'll see how much is remaining and a warning when you're close to the limit.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Budget (KSh) *</label>
                  <input
                    type="number" min="1" step="100"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveBudget(); }}
                    placeholder="e.g. 80000"
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  />
                  {budgetInput && stats && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      At current spend of {fmt(stats.thisMonthTotal)}, you would have{' '}
                      <span className={parseFloat(budgetInput) - stats.thisMonthTotal >= 0 ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>
                        {fmt(Math.abs(parseFloat(budgetInput) - stats.thisMonthTotal))}
                      </span>{' '}
                      {parseFloat(budgetInput) - stats.thisMonthTotal >= 0 ? 'remaining' : 'over budget'}.
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={saveBudget} disabled={isSavingBudget}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm">
                    {isSavingBudget ? 'Saving...' : 'Save Budget'}
                  </button>
                  <button onClick={() => setShowBudgetModal(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
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
