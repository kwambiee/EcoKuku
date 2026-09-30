'use client';

import { useState, FormEvent } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

const AGE_GROUPS = [
  { value: 'day-old',  label: 'Day-Old Chicks',  price: 'KSh 110/chick' },
  { value: '1-week',   label: '1 Week Old',       price: 'KSh 150/chick' },
  { value: '2-weeks',  label: '2 Weeks Old',      price: 'KSh 190/chick' },
  { value: '3-weeks',  label: '3 Weeks Old',      price: 'KSh 230/chick' },
  { value: 'kienyeji', label: 'Pure Kienyeji',    price: 'On request' },
];

const FIELD = `
  w-full px-4 py-3 rounded-lg border bg-white text-sm
  focus:outline-none transition-all
`.replace(/\s+/g, ' ').trim();

export default function BookingForm() {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', ageGroup: '', quantity: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: keyof typeof form, v: string) => { setForm((f) => ({ ...f, [k]: v })); if (error) setError(''); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.ageGroup) {
      setError('Please fill in your name, phone number and chick age group.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName:  form.lastName,
          phone:     form.phone,
          ageGroup:  form.ageGroup,
          quantity:  form.quantity ? parseInt(form.quantity, 10) : undefined,
          notes:     form.notes   || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try WhatsApp instead.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--forest-light)' }}>
          <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--forest)' }} />
        </div>
        <h3 className="font-display text-2xl font-bold" style={{ color: 'var(--text-dark)' }}>Booking received!</h3>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-mid)' }}>
          We will call you back shortly to confirm your order. Thank you!
        </p>
        <button
          onClick={() => { setSuccess(false); setForm({ firstName: '', lastName: '', phone: '', ageGroup: '', quantity: '', notes: '' }); }}
          className="mt-2 text-sm font-semibold hover:underline"
          style={{ color: 'var(--amber-dark)' }}
        >
          Submit another booking
        </button>
      </div>
    );
  }

  const labelCls = 'block text-xs font-bold uppercase tracking-wider mb-1.5';

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={{ color: 'var(--text-mid)' }}>First Name</label>
          <input type="text" value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
            placeholder="e.g. Wanjiku" className={FIELD}
            style={{ borderColor: 'var(--cream-dark)', color: 'var(--text-dark)' }} />
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--text-mid)' }}>Last Name</label>
          <input type="text" value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
            placeholder="e.g. Kamau" className={FIELD}
            style={{ borderColor: 'var(--cream-dark)', color: 'var(--text-dark)' }} />
        </div>
      </div>

      <div>
        <label className={labelCls} style={{ color: 'var(--text-mid)' }}>WhatsApp / Phone Number</label>
        <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
          placeholder="e.g. 0182 193 380" className={FIELD}
          style={{ borderColor: 'var(--cream-dark)', color: 'var(--text-dark)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={{ color: 'var(--text-mid)' }}>Age of Chicks</label>
          <select value={form.ageGroup} onChange={(e) => set('ageGroup', e.target.value)}
            className={FIELD} style={{ borderColor: 'var(--cream-dark)', color: form.ageGroup ? 'var(--text-dark)' : 'var(--text-soft)' }}>
            <option value="">Select age group</option>
            {AGE_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>{g.label} — {g.price}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} style={{ color: 'var(--text-mid)' }}>How Many? (optional)</label>
          <input type="number" min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)}
            placeholder="e.g. 50" className={FIELD}
            style={{ borderColor: 'var(--cream-dark)', color: 'var(--text-dark)' }} />
        </div>
      </div>

      <div>
        <label className={labelCls} style={{ color: 'var(--text-mid)' }}>Notes (optional)</label>
        <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)}
          placeholder="Any questions or special requirements..."
          className={`${FIELD} resize-none`}
          style={{ borderColor: 'var(--cream-dark)', color: 'var(--text-dark)' }} />
      </div>

      {error && (
        <p className="text-sm rounded-lg px-4 py-2.5 border"
          style={{ color: '#991B1B', background: '#FEF2F2', borderColor: '#FECACA' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-lg font-bold text-sm text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: 'var(--forest)' }}
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Booking Request'}
      </button>

      <p className="text-xs text-center" style={{ color: 'var(--text-soft)' }}>
        No payment required online. We will call you back to confirm.
      </p>
    </form>
  );
}
