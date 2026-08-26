'use client';

import { useState } from 'react';
import { CheckCircle, Loader } from 'lucide-react';

export default function RequestAccessPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'STAFF', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/staff-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-700" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Request submitted</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Your request has been sent to the admin team. You will receive an email at{' '}
            <strong>{form.email}</strong> once your account is approved.
          </p>
          <p className="text-gray-400 text-xs mt-4">This usually takes less than 24 hours.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-base">🐔</div>
            <div className="text-left">
              <div className="font-bold text-green-900 text-sm leading-tight">Kwamboka</div>
              <div className="text-[10px] text-green-700 opacity-70 uppercase tracking-widest -mt-0.5">Poultry Farm</div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Request Access</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in your details — an admin will approve your account</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text" required value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="Jane Muthoni"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
              <input
                type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
                placeholder="jane@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                placeholder="+254700000000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Role Requested *</label>
              <select
                value={form.role} onChange={(e) => set('role', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                <option value="STAFF">Farm Staff — manage batches, eggs, feed, health</option>
                <option value="DRIVER">Delivery / Rider — manage assigned deliveries only</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Message <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.message} onChange={(e) => set('message', e.target.value)}
                placeholder="Briefly describe your role or how you'll use the system…"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-green-900 text-white rounded-lg font-semibold hover:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <><Loader className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                'Submit Request'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Already have an account?{' '}
            <a href="/login" className="text-green-700 font-medium hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
