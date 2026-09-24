'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import { Plus, TrendingUp, Pencil, X, Banknote, Smartphone, Zap, Settings } from 'lucide-react';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'EGGS_SALE',           label: 'Egg Sales' },
  { value: 'LIVE_BIRDS_SALE',     label: 'Live Bird Sales' },
  { value: 'CHICKS_SALE',         label: 'Chick Sales' },
  { value: 'MANURE_SALE',         label: 'Manure Sales' },
  { value: 'BATCH_ORDER_DEPOSIT', label: 'Batch Order Deposit' },
  { value: 'OTHER',               label: 'Other Income' },
];

const CATEGORY_COLORS: Record<string, string> = {
  EGGS_SALE:           'bg-yellow-100 text-yellow-800',
  LIVE_BIRDS_SALE:     'bg-orange-100 text-orange-800',
  CHICKS_SALE:         'bg-amber-100 text-amber-800',
  MANURE_SALE:         'bg-green-100 text-green-800',
  BATCH_ORDER_DEPOSIT: 'bg-blue-100 text-blue-800',
  OTHER:               'bg-gray-100 text-gray-700',
};

const PAYMENT_METHODS = ['MPESA', 'CASH', 'BANK_TRANSFER'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface IncomeRecord {
  id: string; date: string; category: string; description: string;
  amount: number; paymentMethod?: string; buyerName?: string; buyerPhone?: string;
  receiptRef?: string; mpesaTransactionId?: string; accountReference?: string;
  sourceType?: string; notes?: string;
}
interface CategoryBreakdown { category: string; total: number; count: number; }

const emptyForm = {
  category: '', description: '', amount: '',
  date: new Date().toISOString().split('T')[0],
  paymentMethod: 'MPESA', buyerName: '', receiptRef: '', notes: '',
};

const emptyStkForm = { phone: '', amount: '', accountReference: '', description: '' };

// ─────────────────────────────────────────────────────────────────────────────
export default function IncomePage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const now = new Date();

  const [year, setYear]           = useState(now.getFullYear());
  const [month, setMonth]         = useState(now.getMonth() + 1);
  const [records, setRecords]     = useState<IncomeRecord[]>([]);
  const [total, setTotal]         = useState(0);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Manual form
  const [showForm, setShowForm]         = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | null>(null);
  const [form, setForm]                 = useState(emptyForm);
  const [isSaving, setIsSaving]         = useState(false);

  // STK Push form
  const [showStk, setShowStk]     = useState(false);
  const [stkForm, setStkForm]     = useState(emptyStkForm);
  const [isStkSending, setIsStkSending] = useState(false);

  // M-Pesa setup
  const [showSetup, setShowSetup] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  async function fetchData() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/income?year=${year}&month=${month}`);
      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setByCategory(data.byCategory || []);
    } catch { toast.error('Failed to load income data'); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { fetchData(); }, [year, month]);

  // ── Manual record ──────────────────────────────────────────────────────────
  function openAdd() { setEditingRecord(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(r: IncomeRecord) {
    setEditingRecord(r);
    setForm({
      category: r.category, description: r.description, amount: String(r.amount),
      date: new Date(r.date).toISOString().split('T')[0],
      paymentMethod: r.paymentMethod || 'MPESA',
      buyerName: r.buyerName || '', receiptRef: r.receiptRef || '', notes: r.notes || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setIsSaving(true);
    try {
      const isEdit = !!editingRecord;
      const res = await fetch('/api/income', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { incomeId: editingRecord!.id, ...form } : form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      toast.success(isEdit ? 'Income record updated' : 'Income recorded');
      setShowForm(false); setEditingRecord(null); fetchData();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setIsSaving(false); }
  }

  function handleDelete(r: IncomeRecord) {
    toast(`Delete KSh ${r.amount.toLocaleString()}?`, {
      description: r.description,
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const res = await fetch('/api/income', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ incomeId: r.id }) });
            if (!res.ok) throw new Error();
            toast.success('Deleted'); fetchData();
          } catch { toast.error('Failed to delete'); }
        },
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  }

  // ── STK Push ───────────────────────────────────────────────────────────────
  async function sendStkPush(e: React.FormEvent) {
    e.preventDefault(); setIsStkSending(true);
    try {
      const res = await fetch('/api/mpesa/stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...stkForm, amount: parseFloat(stkForm.amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(`M-Pesa prompt sent! ${data.customerMessage || ''}`);
      setShowStk(false); setStkForm(emptyStkForm);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsStkSending(false); }
  }

  // ── C2B URL Registration ───────────────────────────────────────────────────
  async function registerC2BUrls() {
    setIsRegistering(true);
    try {
      const res = await fetch('/api/mpesa/c2b');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('C2B URLs registered with Safaricom! Payments will now auto-record.');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsRegistering(false); }
  }

  const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v;
  const mpesaRecords  = records.filter((r) => r.sourceType?.startsWith('MPESA'));

  function sourceTypeBadge(r: IncomeRecord) {
    if (r.sourceType === 'MPESA_C2B') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 font-semibold">Auto · Paybill</span>;
    if (r.sourceType === 'MPESA_STK') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">Auto · STK</span>;
    return null;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={24} className="text-green-800" />
              <h1 className="text-2xl font-bold">Income</h1>
              {mpesaRecords.length > 0 && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  {mpesaRecords.length} via M-Pesa
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-1">Log sales and track revenue. M-Pesa payments auto-record when they arrive.</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => setShowSetup(!showSetup)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                <Settings size={14} /> M-Pesa Setup
              </button>
            )}
            <button onClick={() => { setShowStk(true); setStkForm(emptyStkForm); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-800 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100">
              <Smartphone size={14} /> STK Push
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus size={15} /> Record Income
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">

          {/* ── M-Pesa Setup panel (admin only) ──────────────────────────────── */}
          {isAdmin && showSetup && (
            <div className="bg-white rounded-xl border border-green-200 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-green-700" />
                <h2 className="font-bold text-base">M-Pesa Daraja Setup</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-gray-800">Required server env vars</p>
                  <p className="text-gray-500 text-xs">Add these to <code className="bg-gray-200 px-1 rounded">/var/www/ecokuku/apps/admin/.env.local</code></p>
                  <pre className="text-xs bg-gray-100 rounded p-3 overflow-x-auto leading-relaxed text-gray-700">{`MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=your_till_number
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=production
NEXT_PUBLIC_APP_URL=https://admin.kwambokapoultry.co.ke`}</pre>
                </div>
                <div className="bg-green-50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-gray-800">Callback URLs to register</p>
                  <p className="text-gray-500 text-xs">These are the URLs Safaricom will call when money arrives. Click below after setting env vars.</p>
                  <p className="text-xs font-mono text-green-800 break-all">
                    Confirmation: /api/mpesa/c2b<br />
                    STK Callback: /api/mpesa/stk
                  </p>
                  <button onClick={registerC2BUrls} disabled={isRegistering}
                    className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-800 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
                    <Zap size={12} />
                    {isRegistering ? 'Registering…' : 'Register C2B URLs with Safaricom'}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Getting your Daraja credentials</p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-700">
                  <li>Register at <strong>developer.safaricom.co.ke</strong> → Create App → copy Consumer Key + Secret</li>
                  <li>Use your <strong>Till Number</strong> (Buy Goods) as <code className="bg-amber-100 px-0.5 rounded">MPESA_SHORTCODE</code></li>
                  <li>Get your <strong>Passkey</strong> from the Daraja portal (needed for STK Push)</li>
                  <li>Paste into <code>.env.local</code> on the server, then click "Register C2B URLs" above</li>
                </ol>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>How it works (Till/Buy Goods):</strong> When a customer pays via your till, Safaricom instantly calls
                <code className="mx-1 bg-gray-100 px-1 rounded">/api/mpesa/c2b</code>
                with the buyer's name, phone number and amount. An Income record is created automatically.</p>
                <p><strong>Order matching:</strong> Till numbers don't have an account reference field, so the system matches payments to orders using the customer's phone number + amount. If no exact match is found the income is still recorded — staff can link it manually by editing the record.</p>
              </div>
            </div>
          )}

          {/* ── Month/Year filter ──────────────────────────────────────────────── */}
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

          {/* ── Summary cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4 lg:col-span-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Total — {MONTHS[month - 1]} {year}
              </p>
              <p className="text-3xl font-bold mt-1 text-green-700">KSh {total.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">
                {records.length} records
                {mpesaRecords.length > 0 && ` · ${mpesaRecords.length} auto via M-Pesa`}
              </p>
            </div>
            {byCategory.sort((a, b) => b.total - a.total).slice(0, 2).map((c) => (
              <div key={c.category} className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 font-medium">{categoryLabel(c.category)}</p>
                <p className="text-2xl font-bold mt-1">KSh {c.total.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.count} entries</p>
              </div>
            ))}
          </div>

          {/* ── Category breakdown bar chart ──────────────────────────────────── */}
          {byCategory.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-bold text-base mb-4">Breakdown by category</h2>
              <div className="space-y-3">
                {byCategory.sort((a, b) => b.total - a.total).map((c) => {
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

          {/* ── Records table ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Income records</h2>
              <button onClick={openAdd}
                className="text-sm text-green-700 font-medium hover:underline flex items-center gap-1">
                <Plus size={14} /> Add record
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center">
                <Banknote size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No income recorded for {MONTHS[month - 1]} {year}</p>
                <p className="text-gray-400 text-sm mt-1">M-Pesa payments auto-record once the paybill webhook is configured.</p>
                <button onClick={openAdd}
                  className="mt-4 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  Record manually
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Buyer</th>
                      <th className="px-4 py-3 text-left">Method</th>
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
                          <div className="flex flex-col gap-0.5">
                            <span>{r.description}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {sourceTypeBadge(r)}
                              {r.mpesaTransactionId && (
                                <span className="text-[10px] text-gray-400 font-mono">{r.mpesaTransactionId}</span>
                              )}
                              {r.accountReference && !r.mpesaTransactionId && (
                                <span className="text-[10px] text-gray-400">Ref: {r.accountReference}</span>
                              )}
                              {r.notes && !r.mpesaTransactionId && (
                                <span className="text-[10px] text-gray-400 italic">{r.notes}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          <div>{r.buyerName || '—'}</div>
                          {r.buyerPhone && <div className="text-[11px] text-gray-400">{r.buyerPhone}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.paymentMethod ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                              {r.paymentMethod.replace('_', ' ')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-green-700 tabular-nums">
                          {r.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(r)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDelete(r)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
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
                      <td className="px-4 py-3 text-right text-base font-bold text-green-700 tabular-nums">
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

        {/* ════════════════════════════════════
            MANUAL INCOME FORM
        ════════════════════════════════════ */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold text-xl">{editingRecord ? 'Edit Income Record' : 'Record Income'}</h2>
                <button onClick={() => { setShowForm(false); setEditingRecord(null); }}><X size={20} className="text-gray-400" /></button>
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
                      <option value="">Select…</option>
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                  <input type="text" required value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. 30 trays eggs to Mama Njeri, 50 broilers…" />
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Mama Njeri" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Receipt / Ref no.</label>
                    <input type="text" value={form.receiptRef}
                      onChange={(e) => setForm({ ...form, receiptRef: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="M-Pesa ref or receipt no." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSaving ? 'Saving…' : editingRecord ? 'Save Changes' : 'Record Income'}
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

        {/* ════════════════════════════════════
            STK PUSH MODAL
        ════════════════════════════════════ */}
        {showStk && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Smartphone size={18} className="text-green-700" />
                  <h2 className="font-bold text-base">Send M-Pesa Request (STK Push)</h2>
                </div>
                <button onClick={() => setShowStk(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <form onSubmit={sendStkPush} className="p-5 space-y-4">
                <p className="text-sm text-gray-500">
                  The customer will see a payment prompt on their phone. They enter their PIN to complete.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone number *</label>
                  <input type="tel" required value={stkForm.phone}
                    onChange={(e) => setStkForm({ ...stkForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="0712 345 678 or 254712345678" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (KSh) *</label>
                  <input type="number" required value={stkForm.amount}
                    onChange={(e) => setStkForm({ ...stkForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 1500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Order / Reference <span className="text-gray-400 font-normal">(shown to customer)</span></label>
                  <input type="text" value={stkForm.accountReference}
                    onChange={(e) => setStkForm({ ...stkForm, accountReference: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. ORD-001 or Eggs payment" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(max 13 chars)</span></label>
                  <input type="text" maxLength={13} value={stkForm.description}
                    onChange={(e) => setStkForm({ ...stkForm, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Farm payment" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isStkSending}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isStkSending ? 'Sending…' : 'Send Prompt'}
                  </button>
                  <button type="button" onClick={() => setShowStk(false)}
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
