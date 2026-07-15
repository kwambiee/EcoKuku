'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import { Plus, Target, Trash2, X, TrendingUp, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

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
}

interface Periods { weekly: string; monthly: string; yearly: string; }

const CATEGORIES = [
  { value: 'EGG_PRODUCTION', label: 'Egg Production', unit: 'eggs', icon: '🥚' },
  { value: 'REVENUE',        label: 'Revenue',        unit: 'KSh',  icon: '💰' },
  { value: 'ORDERS',         label: 'Customer Orders', unit: 'orders', icon: '📦' },
  { value: 'CHICK_COUNT',    label: 'Chicks Acquired', unit: 'chicks', icon: '🐣' },
  { value: 'FEED_USAGE',     label: 'Feed Usage',     unit: 'kg',   icon: '🌾' },
  { value: 'EXPENSES',       label: 'Expenses (keep under)', unit: 'KSh', icon: '📉' },
  { value: 'MORTALITY_RATE', label: 'Mortality Rate (keep under)', unit: '%', icon: '⚕️' },
];

const TYPE_LABELS: Record<string, string> = { WEEKLY: 'This Week', MONTHLY: 'This Month', YEARLY: 'This Year' };

const EMPTY_FORM = { type: 'MONTHLY', category: 'EGG_PRODUCTION', target: '', label: '', notes: '' };

function periodLabel(period: string) {
  if (/W/.test(period)) return `Week ${period.split('-W')[1]}, ${period.split('-W')[0]}`;
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
  }
  return period;
}

function fmt(n: number, unit: string) {
  if (unit === 'KSh') return `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
  if (unit === '%') return `${n.toFixed(1)}%`;
  return `${n.toLocaleString()} ${unit}`;
}

function ProgressBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color = pct >= 100 ? 'bg-green-500'
    : pct >= 70 ? 'bg-green-400'
    : pct >= 40 ? 'bg-amber-400'
    : 'bg-red-400';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${capped}%` }} />
    </div>
  );
}

function StatusIcon({ pct }: { pct: number }) {
  if (pct >= 100) return <CheckCircle size={16} className="text-green-500 flex-shrink-0" />;
  if (pct >= 70) return <TrendingUp size={16} className="text-green-400 flex-shrink-0" />;
  if (pct >= 40) return <Clock size={16} className="text-amber-500 flex-shrink-0" />;
  return <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />;
}

function GoalCard({ goal, onDelete }: { goal: Goal; cat: typeof CATEGORIES[0]; onDelete: () => void }) {
  const cat = CATEGORIES.find(c => c.value === goal.category)!;
  const pct = goal.progressPct;
  const pctColor = pct >= 100 ? 'text-green-600' : pct >= 70 ? 'text-green-500' : pct >= 40 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{cat?.icon}</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{goal.label || cat?.label}</p>
            <p className="text-xs text-gray-400">{periodLabel(goal.period)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusIcon pct={pct} />
          <button onClick={onDelete} className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <ProgressBar pct={pct} />

      <div className="flex items-center justify-between mt-2">
        <div>
          <span className="text-xs text-gray-500">Actual: </span>
          <span className="text-sm font-bold text-gray-900">{fmt(goal.actual, cat?.unit || '')}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500">Target: </span>
          <span className="text-sm font-medium text-gray-600">{fmt(goal.target, cat?.unit || '')}</span>
        </div>
      </div>

      <div className={`text-right mt-1 text-xs font-bold ${pctColor}`}>
        {pct >= 100 ? '✓ Goal reached!' : `${pct}% ${goal.isLowerBetter ? 'maintained' : 'complete'}`}
      </div>

      {goal.notes && (
        <p className="mt-2 text-xs text-gray-400 italic border-t pt-2">{goal.notes}</p>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [periods, setPeriods] = useState<Periods | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');

  const fetchGoals = async () => {
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
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.target || parseFloat(formData.target) <= 0) {
      toast.error('Enter a valid target value');
      return;
    }
    setIsSaving(true);
    try {
      const period = activeTab === 'WEEKLY' ? periods?.weekly
        : activeTab === 'MONTHLY' ? periods?.monthly
        : periods?.yearly;

      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type: activeTab, period }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      toast.success('Goal saved');
      setShowForm(false);
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

  const tabGoals = goals.filter(g => g.type === activeTab);
  const onTrack = tabGoals.filter(g => g.progressPct >= 70).length;
  const atRisk = tabGoals.filter(g => g.progressPct < 70 && g.progressPct >= 40).length;
  const behind = tabGoals.filter(g => g.progressPct < 40).length;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Target size={26} className="text-green-700" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Goals & Targets</h1>
              <p className="text-gray-500 text-sm">Track weekly, monthly and yearly farm targets</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg font-medium hover:bg-green-700 text-sm">
            <Plus size={16} /> Add Goal
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
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

          {/* Summary pills */}
          {tabGoals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                <CheckCircle size={12} /> {onTrack} on track
              </span>
              {atRisk > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200">
                  <Clock size={12} /> {atRisk} at risk
                </span>
              )}
              {behind > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                  <AlertTriangle size={12} /> {behind} behind
                </span>
              )}
            </div>
          )}

          {/* Goals grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-32 animate-pulse" />)}
            </div>
          ) : tabGoals.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Target size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-semibold text-gray-500">No {TYPE_LABELS[activeTab].toLowerCase()} goals set</p>
              <p className="text-sm text-gray-400 mt-1">Click &quot;Add Goal&quot; to set your first target</p>
              <button onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                <Plus size={14} /> Add your first goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tabGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  cat={CATEGORIES.find(c => c.value === goal.category)!}
                  onDelete={() => handleDelete(goal.id)}
                />
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Progress key</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> ≥100% — Goal reached</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> 70–99% — On track</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 40–69% — At risk</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> &lt;40% — Behind</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">* For Expenses and Mortality Rate, &quot;progress&quot; means staying under the target (lower is better).</p>
          </div>
        </div>

        {/* ADD GOAL MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-200 flex justify-between sticky top-0 bg-white z-10">
                <div>
                  <h2 className="font-bold text-lg">Add Goal</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Set a target for {TYPE_LABELS[activeTab].toLowerCase()}</p>
                </div>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Period</label>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {(['WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setActiveTab(t)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          activeTab === t ? 'bg-white text-green-800 shadow-sm' : 'text-gray-500'
                        }`}>
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {activeTab === 'WEEKLY' ? `Week: ${periods?.weekly}` : activeTab === 'MONTHLY' ? `Month: ${periods?.monthly}` : `Year: ${periods?.yearly}`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label} ({c.unit})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Target ({CATEGORIES.find(c => c.value === formData.category)?.unit}) *
                  </label>
                  <input type="number" required min="0" step="any" value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder={formData.category === 'REVENUE' ? 'e.g. 150000' : formData.category === 'EGG_PRODUCTION' ? 'e.g. 5000' : 'Enter target'} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Custom label <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Q3 Revenue Target" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea rows={2} value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="Any context or strategy notes..." />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm">
                    {isSaving ? 'Saving...' : 'Save Goal'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
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
