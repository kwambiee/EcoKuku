'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Phone, RefreshCw, MessageSquare } from 'lucide-react';

interface Inquiry {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  ageGroup: string;
  quantity: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

const AGE_LABELS: Record<string, string> = {
  'day-old':  'Day-Old',
  '1-week':   '1 Week',
  '2-weeks':  '2 Weeks',
  '3-weeks':  '3 Weeks',
  'kienyeji': 'Kienyeji',
};

const STATUS_STYLES: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-800',
  CONTACTED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const STATUSES = ['PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED'];

const WA_BASE = 'https://wa.me/';

export default function InquiriesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);
  useEffect(() => { if (session?.user) fetchInquiries(); }, [session, filterStatus]);

  async function fetchInquiries() {
    setIsLoading(true);
    try {
      const url = filterStatus ? `/api/inquiries?status=${filterStatus}` : '/api/inquiries';
      const res = await fetch(url);
      const data = await res.json();
      setInquiries(data.data || []);
    } catch { setInquiries([]); }
    finally { setIsLoading(false); }
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      setInquiries((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
    } finally { setUpdating(null); }
  }

  function waLink(phone: string) {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? '254' + digits.slice(1) : digits;
    return `${WA_BASE}${normalized}?text=Hello%2C%20this%20is%20Kwamboka%20Poultry%20following%20up%20on%20your%20chick%20booking%20request.`;
  }

  const pending = inquiries.filter((i) => i.status === 'PENDING').length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-green-700" />
              Booking Inquiries
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Customer chick booking requests from the website
              {pending > 0 && <span className="ml-2 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">{pending} pending</span>}
            </p>
          </div>
          <button
            onClick={fetchInquiries}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['', ...STATUSES].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${filterStatus === s ? 'bg-green-800 text-white border-green-800' : 'bg-white text-gray-600 border-gray-200 hover:border-green-500'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No inquiries yet</p>
            <p className="text-sm mt-1">Booking requests from the website will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Age Group</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Received</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inquiries.map((inq) => (
                    <tr key={inq.id} className={`hover:bg-gray-50 transition-colors ${inq.status === 'PENDING' ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {inq.firstName} {inq.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 font-mono text-xs">{inq.phone}</span>
                          <a
                            href={waLink(inq.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open WhatsApp"
                            className="text-[#25D366] hover:text-green-700 flex-shrink-0"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </a>
                          <a
                            href={`tel:${inq.phone}`}
                            title="Call"
                            className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{AGE_LABELS[inq.ageGroup] || inq.ageGroup}</td>
                      <td className="px-4 py-3 text-gray-600">{inq.quantity ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate" title={inq.notes || ''}>{inq.notes || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(inq.createdAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[inq.status] || 'bg-gray-100 text-gray-500'}`}>
                          {inq.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={inq.status}
                          disabled={updating === inq.id}
                          onChange={(e) => updateStatus(inq.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
