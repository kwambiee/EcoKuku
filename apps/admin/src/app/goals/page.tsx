'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import {
  Plus, Target, Trash2, X, CheckCircle, AlertTriangle, Clock,
  TrendingUp, TrendingDown, Pencil, ChevronDown, ChevronUp,
  Star, ListChecks, Send, ThumbsUp, Lightbulb,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalCheckpoint {
  id: string;
  text: string;
  isCustom: boolean;
  checked: boolean;
  order: number;
  positives?: string;
  challenges?: string;
  improvements?: string;
}

interface GoalReview {
  id: string;
  status: 'ACHIEVED' | 'PARTIAL' | 'MISSED';
  positives?: string;
  challenges?: string;
  notes?: string;
}

interface Goal {
  id: string;
  type: 'WEEKLY' | 'MONTHLY';
  category: string;
  target: number | null;
  actual: number;
  progressPct: number;
  isLowerBetter: boolean;
  isWeeklyChecklist: boolean;
  period: string;
  label?: string;
  notes?: string;
  review: GoalReview | null;
  checkpoints: GoalCheckpoint[];
  lastPeriod: { period: string; actual: number | null; target: number | null; status: string | null } | null;
}

interface Periods { weekly: string; monthly: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKLY_CATEGORIES = [
  { value: 'EGG_PRODUCTION',   label: 'Egg Production',             icon: '🥚', count: 9 },
  { value: 'FEED_USAGE',       label: 'Feed Management',            icon: '🌾', count: 7 },
  { value: 'FLOCK_HEALTH',     label: 'Flock Health & Biosecurity', icon: '⚕️', count: 8 },
  { value: 'BROODER_CARE',     label: 'Brooder & Chick Care',       icon: '🐣', count: 7 },
  { value: 'ORDER_FULFILLMENT',label: 'Orders & Customer Service',  icon: '📦', count: 7 },
];

const MONTHLY_CATEGORIES = [
  { value: 'REVENUE',     label: 'Revenue',        icon: '💰', unit: 'KSh' },
  { value: 'EXPENSES',    label: 'Expenses',       icon: '📉', unit: 'KSh', lowerBetter: true },
  { value: 'ORDERS',      label: 'Customer Orders',icon: '📦', unit: 'orders' },
  { value: 'FLOCK_COUNT', label: 'Flock Count',    icon: '🐔', unit: 'birds' },
  { value: 'EGG_VOLUME',  label: 'Egg Volume',     icon: '🥚', unit: 'eggs' },
];

const ALL_CATEGORIES = [...WEEKLY_CATEGORIES, ...MONTHLY_CATEGORIES];

const STATUS_CFG = {
  ACHIEVED: { label: 'Achieved',           color: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle size={12} /> },
  PARTIAL:  { label: 'Partially achieved', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: <Clock size={12} /> },
  MISSED:   { label: 'Missed',             color: 'bg-red-100 text-red-700 border-red-300',       icon: <AlertTriangle size={12} /> },
};

function periodLabel(period: string) {
  if (/W/.test(period)) return `Week ${period.split('-W')[1]}, ${period.split('-W')[0]}`;
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
  }
  return period;
}

function fmtNum(n: number | null, unit: string) {
  if (n === null || n === undefined) return '—';
  if (unit === 'KSh') return `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
  if (unit === '%') return `${n.toFixed(1)}%`;
  return `${n.toLocaleString()} ${unit}`;
}

// ─── Per-item feedback row ────────────────────────────────────────────────────

function CheckpointItem({
  cp,
  onToggle,
  onDelete,
  onFeedbackSave,
}: {
  cp: GoalCheckpoint;
  onToggle: (id: string, checked: boolean) => void;
  onDelete?: (id: string) => void;
  onFeedbackSave: (id: string, field: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    positives: cp.positives ?? '',
    challenges: cp.challenges ?? '',
    improvements: cp.improvements ?? '',
  });
  const [saving, setSaving] = useState(false);
  const hasFeedback = !!(cp.positives || cp.challenges || cp.improvements);

  const saveFeedback = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/goals/checkpoints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feedback', checkpointId: cp.id, ...form }),
      });
      if (!res.ok) throw new Error();
      onFeedbackSave(cp.id, 'all', JSON.stringify(form));
      toast.success('Feedback saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`border-b border-gray-50 last:border-b-0 ${open ? 'bg-stone-50' : ''}`}>
      {/* Checkbox row */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 group">
        <button
          onClick={() => onToggle(cp.id, !cp.checked)}
          className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
            cp.checked ? 'bg-green-600 border-green-600' : 'border-gray-300 hover:border-green-500'
          }`}
        >
          {cp.checked && <CheckCircle size={10} className="text-white" />}
        </button>

        <span className={`flex-1 text-xs leading-relaxed ${cp.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
          {cp.text}
          {cp.isCustom && <span className="ml-1.5 text-[10px] text-blue-500 font-medium">custom</span>}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {hasFeedback && !open && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Has feedback" />
          )}
          <button
            onClick={() => setOpen(!open)}
            className={`p-1 rounded transition-colors text-xs font-medium flex items-center gap-0.5 ${
              open ? 'text-green-700 bg-green-50' : 'text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100'
            }`}
            title="Add feedback for this item"
          >
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {cp.isCustom && onDelete && (
            <button onClick={() => onDelete(cp.id)} className="p-1 text-gray-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all">
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Per-item feedback */}
      {open && (
        <div className="px-4 pb-3 pt-1 ml-7 space-y-2.5 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-1">Feedback for this item</p>

          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-green-700 mb-1">
              <ThumbsUp size={10} /> What went well
            </label>
            <textarea rows={1} value={form.positives}
              onChange={(e) => setForm({ ...form, positives: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-green-300 bg-white"
              placeholder="e.g. Hens fed on time every morning this week..." />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-red-600 mb-1">
              <AlertTriangle size={10} /> Challenge
            </label>
            <textarea rows={1} value={form.challenges}
              onChange={(e) => setForm({ ...form, challenges: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-red-200 bg-white"
              placeholder="e.g. Evening feeding was delayed on 2 days..." />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 mb-1">
              <Lightbulb size={10} /> How to improve
            </label>
            <textarea rows={1} value={form.improvements}
              onChange={(e) => setForm({ ...form, improvements: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-200 bg-white"
              placeholder="e.g. Set an alarm for 6pm feeding next week..." />
          </div>

          <button onClick={saveFeedback} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-medium hover:bg-green-600 disabled:opacity-50 transition-colors">
            <Send size={11} /> {saving ? 'Saving...' : 'Save feedback'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Checklist panel ──────────────────────────────────────────────────────────

function Checklist({ goal }: { goal: Goal }) {
  const [checkpoints, setCheckpoints] = useState<GoalCheckpoint[]>(goal.checkpoints);
  const seedingRef = useRef(false);
  const [newText, setNewText] = useState('');
  const [addingMode, setAddingMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seed standard checkpoints once (guard against StrictMode double-invoke)
  useEffect(() => {
    if (checkpoints.length === 0 && !seedingRef.current) {
      seedingRef.current = true;
      fetch('/api/goals/checkpoints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed', goalId: goal.id, category: goal.category }),
      })
        .then((r) => r.json())
        .then((d) => { if (d.checkpoints?.length) setCheckpoints(d.checkpoints); })
        .catch(() => { seedingRef.current = false; });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (id: string, checked: boolean) => {
    // Update local state immediately — DO NOT trigger parent refetch (avoids drawer close)
    setCheckpoints((prev) => prev.map((c) => c.id === id ? { ...c, checked } : c));
    try {
      await fetch('/api/goals/checkpoints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpointId: id, checked }),
      });
    } catch {
      // Revert on error
      setCheckpoints((prev) => prev.map((c) => c.id === id ? { ...c, checked: !checked } : c));
      toast.error('Failed to update');
    }
  };

  const updateFeedback = (id: string, _field: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      setCheckpoints((prev) => prev.map((c) => c.id === id ? { ...c, ...parsed } : c));
    } catch { /* ignore */ }
  };

  const addCustom = async () => {
    if (!newText.trim()) return;
    const res = await fetch('/api/goals/checkpoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalId: goal.id, text: newText.trim() }),
    });
    if (!res.ok) { toast.error('Failed to add'); return; }
    const data = await res.json();
    if (!checkpoints.find((c) => c.id === data.checkpoint.id)) {
      setCheckpoints([...checkpoints, data.checkpoint]);
    }
    setNewText('');
    setAddingMode(false);
  };

  const deleteCustom = async (id: string) => {
    setCheckpoints((prev) => prev.filter((c) => c.id !== id));
    await fetch('/api/goals/checkpoints', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkpointId: id }),
    }).catch(() => toast.error('Failed to delete'));
  };

  const done = checkpoints.filter((c) => c.checked).length;
  const total = checkpoints.length;

  return (
    <div>
      {/* Checklist header */}
      <div className="px-4 py-2.5 bg-stone-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks size={13} className="text-green-700" />
          <span className="text-xs font-semibold text-gray-700">Weekly checklist</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${
            done === total && total > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
          }`}>{done}/{total}</span>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-200 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <span className="text-[11px] text-gray-500">{Math.round((done / total) * 100)}%</span>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-[11px] text-blue-700">
        Tick each item as you do it. Click the <ChevronDown size={10} className="inline" /> arrow on any item to add feedback — what went well, any challenge, and how to improve.
      </div>

      {/* Items */}
      <div>
        {checkpoints.map((cp) => (
          <CheckpointItem
            key={cp.id}
            cp={cp}
            onToggle={toggle}
            onDelete={cp.isCustom ? deleteCustom : undefined}
            onFeedbackSave={updateFeedback}
          />
        ))}
      </div>

      {/* Add custom */}
      <div className="px-4 py-3 border-t border-gray-100">
        {addingMode ? (
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); if (e.key === 'Escape') { setAddingMode(false); setNewText(''); } }}
              placeholder="e.g. Check water temperature daily"
              className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
              autoFocus />
            <button onClick={addCustom} className="px-2.5 py-1.5 bg-green-700 text-white rounded-lg text-xs hover:bg-green-600"><Send size={11} /></button>
            <button onClick={() => { setAddingMode(false); setNewText(''); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X size={11} /></button>
          </div>
        ) : (
          <button onClick={() => setAddingMode(true)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <Plus size={12} /> Add my own checkpoint
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Review panel ─────────────────────────────────────────────────────────────

function ReviewPanel({ goal, onSaved }: { goal: Goal; onSaved: () => void }) {
  const [form, setForm] = useState({
    status: goal.review?.status ?? 'ACHIEVED' as 'ACHIEVED' | 'PARTIAL' | 'MISSED',
    positives:  goal.review?.positives  ?? '',
    challenges: goal.review?.challenges ?? '',
    notes:      goal.review?.notes      ?? '',
  });
  const [saving, setSaving] = useState(false);

  const checkedCount = goal.checkpoints.filter((c) => c.checked).length;
  const totalCount   = goal.checkpoints.length;

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/goals/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: goal.id, period: goal.period, ...form }),
      });
      if (!res.ok) throw new Error();
      toast.success('Review saved');
      onSaved();
    } catch {
      toast.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-100 bg-stone-50 px-4 pb-4 pt-3 space-y-3">
      <div className="flex items-center gap-2">
        <Star size={13} className="text-amber-500" />
        <span className="text-xs font-semibold text-gray-700">End-of-period review</span>
        {totalCount > 0 && (
          <span className="text-[11px] text-gray-400 ml-1">
            {checkedCount}/{totalCount} checklist items completed
          </span>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Overall achievement</p>
        <div className="flex gap-2 flex-wrap">
          {(['ACHIEVED', 'PARTIAL', 'MISSED'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setForm({ ...form, status: s })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${form.status === s ? STATUS_CFG[s].color + ' ring-2 ring-offset-1 ring-current' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
              {STATUS_CFG[s].icon} {STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1 text-[11px] font-semibold text-green-700 mb-1 uppercase tracking-wide">
          <ThumbsUp size={10} /> Overall — what went well this period?
        </label>
        <textarea rows={2} value={form.positives} onChange={(e) => setForm({ ...form, positives: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-green-300 bg-white"
          placeholder="e.g. Consistent feeding, all nest boxes kept clean, collection done 3x daily..." />
      </div>

      <div>
        <label className="flex items-center gap-1 text-[11px] font-semibold text-red-600 mb-1 uppercase tracking-wide">
          <AlertTriangle size={10} /> Key challenges this period
        </label>
        <textarea rows={2} value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-red-200 bg-white"
          placeholder="e.g. Power cut affected lighting 2 days, feed delivery arrived late..." />
      </div>

      <div>
        <label className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 mb-1 uppercase tracking-wide">
          <Lightbulb size={10} /> Lessons & plan for next period
        </label>
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-200 bg-white"
          placeholder="e.g. Get backup generator for lighting, order feed 3 days earlier next week..." />
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-2 bg-green-800 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50">
        {saving ? 'Saving...' : goal.review ? 'Update review' : 'Save review'}
      </button>
    </div>
  );
}

// ─── Goal row ─────────────────────────────────────────────────────────────────

function GoalRow({ goal, cat, onDelete, onEdit, onReviewSaved }: {
  goal: Goal;
  cat: typeof ALL_CATEGORIES[0];
  onDelete: () => void;
  onEdit: () => void;
  onReviewSaved: () => void;
}) {
  const [openSection, setOpenSection] = useState<'checklist' | 'review' | null>(null);
  const toggle = (s: 'checklist' | 'review') => setOpenSection((prev) => prev === s ? null : s);

  const pct = goal.progressPct;
  const barColor = pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
  const pctColor = pct >= 100 ? 'text-green-700' : pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600';

  const lp = goal.lastPeriod;
  const isWeekly = goal.isWeeklyChecklist;
  const unit = (cat as any).unit ?? '';

  const checkedCount = goal.checkpoints.filter((c) => c.checked).length;
  const totalCount   = goal.checkpoints.length;

  // Last period: for weekly it's checkpoints %, for monthly it's metric %
  const lastPct = lp
    ? isWeekly
      ? null // weekly last-period pct not available (would need stored count)
      : (lp.target && lp.actual !== null ? Math.min(Math.round((lp.actual / lp.target) * 100), 999) : null)
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{goal.label || cat.label}</p>
              <p className="text-xs text-gray-400">{periodLabel(goal.period)}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {goal.review && (
                <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CFG[goal.review.status].color}`}>
                  {STATUS_CFG[goal.review.status].icon} {STATUS_CFG[goal.review.status].label}
                </span>
              )}
              <button onClick={onEdit} title="Edit" className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"><Pencil size={13} /></button>
              <button onClick={onDelete} title="Delete" className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"><Trash2 size={13} /></button>
            </div>
          </div>

          {/* Progress */}
          {isWeekly ? (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: totalCount > 0 ? `${(checkedCount / totalCount) * 100}%` : '0%' }} />
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${pctColor}`}>{checkedCount}/{totalCount}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {checkedCount === totalCount && totalCount > 0 ? '✓ All checkpoints done this week' : `${totalCount - checkedCount} items remaining`}
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <span className={`text-xs font-bold flex-shrink-0 w-10 text-right ${pctColor}`}>{pct}%</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-900">{fmtNum(goal.actual, unit)}</span>
                  <span className="mx-1 text-gray-300">of</span>
                  {fmtNum(goal.target, unit)} target
                </span>
                {lastPct !== null && lp && (
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    {lastPct >= pct ? <TrendingDown size={11} className="text-red-400" /> : <TrendingUp size={11} className="text-green-500" />}
                    Last: {lastPct}%
                    {lp.status && (
                      <span className={`px-1 rounded text-[10px] font-bold ${lp.status === 'ACHIEVED' ? 'text-green-600' : lp.status === 'PARTIAL' ? 'text-amber-600' : 'text-red-500'}`}>
                        {lp.status === 'ACHIEVED' ? '✓' : lp.status === 'PARTIAL' ? '~' : '✗'}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section toggles */}
      <div className={`border-t border-gray-100 ${isWeekly ? 'grid grid-cols-2 divide-x divide-gray-100' : ''}`}>
        {isWeekly && (
          <button onClick={() => toggle('checklist')}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors
              ${openSection === 'checklist' ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            <ListChecks size={13} />
            Checklist
            {totalCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${checkedCount === totalCount ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                {checkedCount}/{totalCount}
              </span>
            )}
            {openSection === 'checklist' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        <button onClick={() => toggle('review')}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors
            ${openSection === 'review' ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
          <Star size={13} className={goal.review ? 'text-amber-400' : ''} />
          {goal.review ? 'View / edit review' : 'Add review'}
          {openSection === 'review' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {openSection === 'checklist' && isWeekly && <Checklist goal={goal} />}
      {openSection === 'review' && <ReviewPanel goal={goal} onSaved={onReviewSaved} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_WEEKLY = { category: 'EGG_PRODUCTION', label: '', notes: '' };
const EMPTY_MONTHLY = { category: 'REVENUE', target: '', label: '', notes: '' };

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [periods, setPeriods] = useState<Periods | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [weeklyForm, setWeeklyForm] = useState(EMPTY_WEEKLY);
  const [monthlyForm, setMonthlyForm] = useState(EMPTY_MONTHLY);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeTab, setActiveTab] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');

  const fetchGoals = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch('/api/goals');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGoals(data.data || []);
      setPeriods(data.periods);
    } catch {
      toast.error('Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingGoal) {
        const targetVal = activeTab === 'MONTHLY' ? parseFloat(monthlyForm.target) : null;
        if (activeTab === 'MONTHLY' && (!monthlyForm.target || isNaN(targetVal!))) {
          toast.error('Enter a valid target'); setIsSaving(false); return;
        }
        const res = await fetch('/api/goals', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalId: editingGoal.id,
            target: targetVal,
            label: activeTab === 'WEEKLY' ? weeklyForm.label : monthlyForm.label,
            notes: activeTab === 'WEEKLY' ? weeklyForm.notes : monthlyForm.notes,
          }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
        toast.success('Goal updated');
      } else {
        const period = activeTab === 'WEEKLY' ? periods?.weekly : periods?.monthly;
        const payload = activeTab === 'WEEKLY'
          ? { type: 'WEEKLY', category: weeklyForm.category, label: weeklyForm.label, notes: weeklyForm.notes, period }
          : { type: 'MONTHLY', category: monthlyForm.category, target: monthlyForm.target, label: monthlyForm.label, notes: monthlyForm.notes, period };

        if (activeTab === 'MONTHLY' && (!monthlyForm.target || parseFloat(monthlyForm.target) <= 0)) {
          toast.error('Enter a valid monthly target'); setIsSaving(false); return;
        }

        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
        toast.success('Goal added');
      }
      setShowForm(false); setEditingGoal(null);
      setWeeklyForm(EMPTY_WEEKLY); setMonthlyForm(EMPTY_MONTHLY);
      fetchGoals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await fetch('/api/goals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalId }) });
      toast.success('Goal removed');
      fetchGoals();
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    if (goal.type === 'WEEKLY') {
      setWeeklyForm({ category: goal.category, label: goal.label || '', notes: goal.notes || '' });
    } else {
      setMonthlyForm({ category: goal.category, target: goal.target ? String(goal.target) : '', label: goal.label || '', notes: goal.notes || '' });
    }
    setActiveTab(goal.type);
    setShowForm(true);
  };

  const tabGoals = goals.filter((g) => g.type === activeTab);
  const reviewed = tabGoals.filter((g) => g.review).length;
  const achieved = tabGoals.filter((g) => g.review?.status === 'ACHIEVED').length;
  const partial  = tabGoals.filter((g) => g.review?.status === 'PARTIAL').length;
  const onTrack  = tabGoals.filter((g) => !g.review && g.progressPct >= 70).length;
  const behind   = tabGoals.filter((g) => !g.review && g.progressPct < 40).length;
  const successRate = tabGoals.length > 0 && reviewed > 0
    ? Math.round(((achieved + partial * 0.5) / tabGoals.length) * 100) : null;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-stone-50">
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Target size={24} className="text-green-700" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Goals & Targets</h1>
              <p className="text-gray-500 text-sm">Weekly checklists · Monthly metrics · Review & improve</p>
            </div>
          </div>
          <button onClick={() => { setEditingGoal(null); setWeeklyForm(EMPTY_WEEKLY); setMonthlyForm(EMPTY_MONTHLY); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 text-sm">
            <Plus size={16} /> Add Goal
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
            {(['WEEKLY', 'MONTHLY'] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? 'bg-green-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {t === 'WEEKLY' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>

          {/* Weekly explanation */}
          {activeTab === 'WEEKLY' && !isLoading && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-800">
              <strong>How weekly goals work:</strong> Each category gives you a checklist of things to do and check during the week.
              Tick items as you go. Add your own checkpoints. On Sunday, open &quot;Add review&quot; to record what went well, challenges, and lessons for next week.
            </div>
          )}

          {/* Monthly explanation */}
          {activeTab === 'MONTHLY' && !isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
              <strong>Monthly metrics:</strong> Set a target number (revenue, expenses, orders, flock count).
              Progress is calculated automatically from your daily data. Review at month end to see if the farm is growing.
            </div>
          )}

          {/* Summary pills */}
          {tabGoals.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              {successRate !== null && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-900 text-white rounded-full text-xs font-bold">
                  <Star size={12} /> {successRate}% success rate
                </span>
              )}
              {achieved > 0 && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200"><CheckCircle size={12} /> {achieved} achieved</span>}
              {partial > 0 && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200"><Clock size={12} /> {partial} partial</span>}
              {onTrack > 0 && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200"><TrendingUp size={12} /> {onTrack} on track</span>}
              {behind > 0 && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200"><AlertTriangle size={12} /> {behind} behind</span>}
            </div>
          )}

          {/* Goals list */}
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 h-24 animate-pulse" />)}</div>
          ) : tabGoals.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <Target size={38} className="mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-500 mb-1">No {activeTab === 'WEEKLY' ? 'weekly' : 'monthly'} goals yet</p>
              <p className="text-sm text-gray-400 mb-4 max-w-xs mx-auto">
                {activeTab === 'WEEKLY'
                  ? 'Add a goal and get an instant checklist of things to monitor this week'
                  : 'Add a monthly target to track revenue, expenses and farm growth'}
              </p>
              <button onClick={() => { setEditingGoal(null); setShowForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <Plus size={14} /> Add first goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tabGoals.map((goal) => {
                const cat = ALL_CATEGORIES.find((c) => c.value === goal.category) ?? ALL_CATEGORIES[0];
                return (
                  <GoalRow key={goal.id} goal={goal} cat={cat}
                    onDelete={() => handleDelete(goal.id)}
                    onEdit={() => openEdit(goal)}
                    onReviewSaved={() => fetchGoals(true)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* FORM MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-200 flex justify-between sticky top-0 bg-white z-10">
                <div>
                  <h2 className="font-bold text-lg">{editingGoal ? 'Edit Goal' : 'Add Goal'}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editingGoal
                      ? `Editing ${editingGoal.type === 'WEEKLY' ? 'weekly checklist' : 'monthly metric'}`
                      : 'Choose type then set your goal'}
                  </p>
                </div>
                <button onClick={() => { setShowForm(false); setEditingGoal(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                {/* Type tabs — only when adding new */}
                {!editingGoal && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Goal type</label>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                      {(['WEEKLY', 'MONTHLY'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setActiveTab(t)}
                          className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${activeTab === t ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500'}`}>
                          {t === 'WEEKLY' ? '📋 Weekly checklist' : '📊 Monthly metric'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {activeTab === 'WEEKLY'
                        ? 'No target number needed — you track by completing checklist items'
                        : 'Set a target number and track actual vs goal automatically'}
                    </p>
                  </div>
                )}

                {/* Weekly form */}
                {activeTab === 'WEEKLY' && (
                  <>
                    {!editingGoal && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                        <div className="space-y-1.5">
                          {WEEKLY_CATEGORIES.map((c) => (
                            <button key={c.value} type="button"
                              onClick={() => setWeeklyForm({ ...weeklyForm, category: c.value })}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
                                weeklyForm.category === c.value
                                  ? 'border-green-600 bg-green-50 text-green-900'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}>
                              <span className="text-xl">{c.icon}</span>
                              <div>
                                <p className="font-medium text-sm">{c.label}</p>
                                <p className="text-[11px] text-gray-400">{c.count} standard checkpoints · you can add your own</p>
                              </div>
                              {weeklyForm.category === c.value && <CheckCircle size={16} className="ml-auto text-green-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Custom label <span className="font-normal text-gray-400">(optional)</span></label>
                      <input type="text" value={weeklyForm.label} onChange={(e) => setWeeklyForm({ ...weeklyForm, label: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. Week 29 Egg Production Push" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Strategy notes <span className="font-normal text-gray-400">(optional)</span></label>
                      <textarea rows={2} value={weeklyForm.notes} onChange={(e) => setWeeklyForm({ ...weeklyForm, notes: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                        placeholder="e.g. New batch arriving Thursday, focus on brooder setup..." />
                    </div>
                  </>
                )}

                {/* Monthly form */}
                {activeTab === 'MONTHLY' && (
                  <>
                    {!editingGoal && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                        <div className="space-y-1.5">
                          {MONTHLY_CATEGORIES.map((c) => (
                            <button key={c.value} type="button"
                              onClick={() => setMonthlyForm({ ...monthlyForm, category: c.value })}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
                                monthlyForm.category === c.value
                                  ? 'border-green-600 bg-green-50 text-green-900'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}>
                              <span className="text-xl">{c.icon}</span>
                              <div>
                                <p className="font-medium text-sm">{c.label}</p>
                                <p className="text-[11px] text-gray-400">Tracked in {c.unit}{(c as any).lowerBetter ? ' · lower is better' : ''}</p>
                              </div>
                              {monthlyForm.category === c.value && <CheckCircle size={16} className="ml-auto text-green-600" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Target ({MONTHLY_CATEGORIES.find((c) => c.value === monthlyForm.category)?.unit ?? ''}) *
                      </label>
                      <input type="number" required min="0" step="any" value={monthlyForm.target}
                        onChange={(e) => setMonthlyForm({ ...monthlyForm, target: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. 150000" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Custom label <span className="font-normal text-gray-400">(optional)</span></label>
                      <input type="text" value={monthlyForm.label} onChange={(e) => setMonthlyForm({ ...monthlyForm, label: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. July Revenue Target" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                      <textarea rows={2} value={monthlyForm.notes} onChange={(e) => setMonthlyForm({ ...monthlyForm, notes: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                        placeholder="e.g. New market channel opening this month..." />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm">
                    {isSaving ? 'Saving...' : editingGoal ? 'Update' : 'Save Goal'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingGoal(null); }}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
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
