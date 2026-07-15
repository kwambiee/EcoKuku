'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import { Plus, Target, Trash2, X, CheckCircle, AlertTriangle, Clock, TrendingUp, TrendingDown, Pencil, ChevronDown, ChevronUp, Star } from 'lucide-react';

interface GoalReview {
  id: string;
  status: 'ACHIEVED' | 'PARTIAL' | 'MISSED';
  positives?: string;
  challenges?: string;
  notes?: string;
}

interface LastPeriod {
  period: string;
  actual: number | null;
  target: number | null;
  status: string | null;
}

interface Goal {
  id: string;
  type: string;
  category: string;
  target: number;
  actual: number;
  progressPct: number;
  isLowerBetter: boolean;
  period: string;
  label?: string;
  notes?: string;
  review: GoalReview | null;
  lastPeriod: LastPeriod | null;
}

interface Periods { weekly: string; monthly: string; yearly: string; }

const CATEGORIES = [
  { value: 'EGG_PRODUCTION', label: 'Egg Production',        unit: 'eggs',   icon: '🥚', hint: 'e.g. 5000' },
  { value: 'REVENUE',        label: 'Revenue',                unit: 'KSh',    icon: '💰', hint: 'e.g. 150000' },
  { value: 'ORDERS',         label: 'Customer Orders',        unit: 'orders', icon: '📦', hint: 'e.g. 50' },
  { value: 'CHICK_COUNT',    label: 'Chicks Acquired',        unit: 'chicks', icon: '🐣', hint: 'e.g. 500' },
  { value: 'FEED_USAGE',     label: 'Feed Usage',             unit: 'kg',     icon: '🌾', hint: 'e.g. 200' },
  { value: 'EXPENSES',       label: 'Expenses (keep under)',  unit: 'KSh',    icon: '📉', hint: 'e.g. 80000' },
  { value: 'MORTALITY_RATE', label: 'Mortality Rate (keep under)', unit: '%', icon: '⚕️', hint: 'e.g. 2' },
];

const TYPE_LABELS: Record<string, string> = { WEEKLY: 'This Week', MONTHLY: 'This Month', YEARLY: 'This Year' };
const EMPTY_FORM = { type: 'WEEKLY', category: 'EGG_PRODUCTION', target: '', label: '', notes: '' };

function periodLabel(period: string) {
  if (/W/.test(period)) return `Week ${period.split('-W')[1]}, ${period.split('-W')[0]}`;
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
  }
  return period;
}

function fmt(n: number | null, unit: string) {
  if (n === null || n === undefined) return '—';
  if (unit === 'KSh') return `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
  if (unit === '%') return `${n.toFixed(1)}%`;
  return `${n.toLocaleString()} ${unit}`;
}

const STATUS_CONFIG = {
  ACHIEVED: { label: 'Achieved', color: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle size={13} /> },
  PARTIAL:  { label: 'Partially achieved', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: <Clock size={13} /> },
  MISSED:   { label: 'Missed', color: 'bg-red-100 text-red-700 border-red-300', icon: <AlertTriangle size={13} /> },
};

function GoalRow({
  goal,
  cat,
  onDelete,
  onEdit,
  onReviewSaved,
}: {
  goal: Goal;
  cat: typeof CATEGORIES[0];
  onDelete: () => void;
  onEdit: () => void;
  onReviewSaved: () => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    status: goal.review?.status ?? 'ACHIEVED',
    positives: goal.review?.positives ?? '',
    challenges: goal.review?.challenges ?? '',
    notes: goal.review?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const pct = goal.progressPct;
  const barColor = pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
  const pctColor = pct >= 100 ? 'text-green-700' : pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600';

  const lp = goal.lastPeriod;
  const lastPct = lp && lp.target && lp.actual !== null
    ? Math.min(Math.round((lp.actual / lp.target) * 100), 999) : null;

  const saveReview = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/goals/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: goal.id, period: goal.period, ...reviewForm }),
      });
      if (!res.ok) throw new Error();
      toast.success('Review saved');
      onReviewSaved();
    } catch {
      toast.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Goal header row */}
      <div className="px-4 py-3 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{goal.label || cat.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{periodLabel(goal.period)}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {goal.review && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CONFIG[goal.review.status].color}`}>
                  {STATUS_CONFIG[goal.review.status].icon}
                  {STATUS_CONFIG[goal.review.status].label}
                </span>
              )}
              <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Edit target">
                <Pencil size={13} />
              </button>
              <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors" title="Delete goal">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className={`text-xs font-bold flex-shrink-0 w-10 text-right ${pctColor}`}>{pct}%</span>
          </div>

          {/* Actual vs Target + last period */}
          <div className="flex items-center justify-between mt-1.5 flex-wrap gap-x-4 gap-y-1">
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-900">{fmt(goal.actual, cat.unit)}</span>
              <span className="mx-1 text-gray-300">of</span>
              <span>{fmt(goal.target, cat.unit)} target</span>
            </div>
            {lp && lastPct !== null && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                {lastPct >= pct
                  ? <TrendingDown size={11} className="text-red-400" />
                  : <TrendingUp size={11} className="text-green-500" />}
                Last: {lastPct}%
                {lp.status && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                    ${lp.status === 'ACHIEVED' ? 'bg-green-50 text-green-700' : lp.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                    {lp.status === 'ACHIEVED' ? '✓' : lp.status === 'PARTIAL' ? '~' : '✗'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback toggle */}
      <button
        onClick={() => setShowFeedback(!showFeedback)}
        className="w-full px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Star size={12} className={goal.review ? 'text-amber-400' : 'text-gray-400'} />
          {goal.review ? 'Review notes saved — click to update' : 'Add review & feedback'}
        </span>
        {showFeedback ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Feedback panel */}
      {showFeedback && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3 bg-gray-50">
          {/* Achievement status */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Achievement status</p>
            <div className="flex gap-2 flex-wrap">
              {(['ACHIEVED', 'PARTIAL', 'MISSED'] as const).map((s) => (
                <button key={s} type="button"
                  onClick={() => setReviewForm({ ...reviewForm, status: s })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                    ${reviewForm.status === s ? STATUS_CONFIG[s].color + ' ring-2 ring-offset-1 ring-current' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                  {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Positives */}
          <div>
            <label className="block text-xs font-semibold text-green-700 mb-1">What went well? (Positives)</label>
            <textarea
              rows={2}
              value={reviewForm.positives}
              onChange={(e) => setReviewForm({ ...reviewForm, positives: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
              placeholder="e.g. Hens laid consistently all week, new batch settled well..."
            />
          </div>

          {/* Challenges */}
          <div>
            <label className="block text-xs font-semibold text-red-600 mb-1">Challenges faced</label>
            <textarea
              rows={2}
              value={reviewForm.challenges}
              onChange={(e) => setReviewForm({ ...reviewForm, challenges: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-red-300 bg-white"
              placeholder="e.g. 2 days of power outage, feed delivery delayed..."
            />
          </div>

          {/* Notes / guide next period */}
          <div>
            <label className="block text-xs font-semibold text-blue-600 mb-1">Notes & lessons (guides next period)</label>
            <textarea
              rows={2}
              value={reviewForm.notes}
              onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              placeholder="e.g. Increase target to 5500 next week, arrange backup feed supplier..."
            />
          </div>

          <button
            onClick={saveReview}
            disabled={saving}
            className="w-full py-2 bg-green-800 text-white rounded-lg text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : goal.review ? 'Update review' : 'Save review'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [periods, setPeriods] = useState<Periods | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeTab, setActiveTab] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
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
    const targetVal = editingGoal ? (formData.target || String(editingGoal.target)) : formData.target;
    if (!targetVal || parseFloat(targetVal) <= 0) {
      toast.error('Enter a valid target value');
      return;
    }
    setIsSaving(true);
    try {
      if (editingGoal) {
        const res = await fetch('/api/goals', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goalId: editingGoal.id, target: parseFloat(targetVal), label: formData.label, notes: formData.notes }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update');
        toast.success('Goal updated');
      } else {
        const period = activeTab === 'WEEKLY' ? periods?.weekly : activeTab === 'MONTHLY' ? periods?.monthly : periods?.yearly;
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, type: activeTab, period }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save');
        toast.success('Goal added');
      }
      setShowForm(false);
      setEditingGoal(null);
      setFormData(EMPTY_FORM);
      fetchGoals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      const res = await fetch('/api/goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Goal removed');
      fetchGoals();
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({ type: goal.type, category: goal.category, target: String(goal.target), label: goal.label || '', notes: goal.notes || '' });
    setShowForm(true);
  };

  const tabGoals = goals.filter((g) => g.type === activeTab);
  const reviewed = tabGoals.filter((g) => g.review).length;
  const achieved = tabGoals.filter((g) => g.review?.status === 'ACHIEVED').length;
  const partial = tabGoals.filter((g) => g.review?.status === 'PARTIAL').length;
  const onTrack = tabGoals.filter((g) => !g.review && g.progressPct >= 70).length;
  const behind = tabGoals.filter((g) => !g.review && g.progressPct < 40).length;
  const successRate = tabGoals.length > 0 && reviewed > 0
    ? Math.round(((achieved + partial * 0.5) / tabGoals.length) * 100) : null;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-stone-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Target size={24} className="text-green-700" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Goals & Targets</h1>
              <p className="text-gray-500 text-sm">Track, review and improve each period</p>
            </div>
          </div>
          <button onClick={() => { setEditingGoal(null); setFormData({ ...EMPTY_FORM, type: activeTab }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 text-sm">
            <Plus size={16} /> Add Goal
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
            {(['WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t ? 'bg-green-800 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Summary bar */}
          {tabGoals.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              {successRate !== null && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-900 text-white rounded-full text-xs font-bold">
                  <Star size={12} /> {successRate}% success rate
                </span>
              )}
              {achieved > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                  <CheckCircle size={12} /> {achieved} achieved
                </span>
              )}
              {partial > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200">
                  <Clock size={12} /> {partial} partial
                </span>
              )}
              {onTrack > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                  <TrendingUp size={12} /> {onTrack} on track
                </span>
              )}
              {behind > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                  <AlertTriangle size={12} /> {behind} behind
                </span>
              )}
            </div>
          )}

          {/* Monthly note */}
          {activeTab === 'MONTHLY' && tabGoals.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
              <strong>Monthly tip:</strong> Review weekly feedback before adjusting monthly targets. Monthly actuals are calculated from all data in this calendar month.
            </div>
          )}

          {/* Goals list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24 animate-pulse" />
              ))}
            </div>
          ) : tabGoals.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Target size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-500">No {TYPE_LABELS[activeTab].toLowerCase()} goals set</p>
              <p className="text-sm text-gray-400 mt-1">Set your first target and track progress here</p>
              <button onClick={() => { setEditingGoal(null); setFormData({ ...EMPTY_FORM, type: activeTab }); setShowForm(true); }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <Plus size={14} /> Add first goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tabGoals.map((goal) => {
                const cat = CATEGORIES.find((c) => c.value === goal.category) ?? CATEGORIES[0];
                return (
                  <GoalRow
                    key={goal.id}
                    goal={goal}
                    cat={cat}
                    onDelete={() => handleDelete(goal.id)}
                    onEdit={() => openEdit(goal)}
                    onReviewSaved={fetchGoals}
                  />
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Progress guide</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-600">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> ≥100% — Goal reached</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> 70–99% — On track</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 40–69% — At risk</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> &lt;40% — Behind</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">For Expenses and Mortality Rate, lower is better — the bar shows how well you stayed under the target.</p>
          </div>
        </div>

        {/* ADD / EDIT GOAL MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-200 flex justify-between sticky top-0 bg-white z-10">
                <div>
                  <h2 className="font-bold text-lg">{editingGoal ? 'Edit Goal' : 'Add Goal'}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {editingGoal ? `Editing: ${CATEGORIES.find(c => c.value === editingGoal.category)?.label}` : `Set a new target`}
                  </p>
                </div>
                <button onClick={() => { setShowForm(false); setEditingGoal(null); }} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                {!editingGoal && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Period</label>
                      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        {(['WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((t) => (
                          <button key={t} type="button" onClick={() => setFormData({ ...formData, type: t })}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              formData.type === t ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500'
                            }`}>
                            {TYPE_LABELS[t]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                      <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.icon} {c.label} ({c.unit})</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Target ({CATEGORIES.find((c) => c.value === (editingGoal?.category || formData.category))?.unit}) *
                  </label>
                  <input type="number" required={!editingGoal} min="0" step="any"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    placeholder={editingGoal ? String(editingGoal.target) : CATEGORIES.find((c) => c.value === formData.category)?.hint}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Custom label <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input type="text" value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Q3 Revenue push" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Notes <span className="text-gray-400 font-normal">(strategy / context)</span>
                  </label>
                  <textarea rows={2} value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="e.g. Targeting peak season, new chick batch arriving Thursday..." />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm">
                    {isSaving ? 'Saving...' : editingGoal ? 'Update Goal' : 'Save Goal'}
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
