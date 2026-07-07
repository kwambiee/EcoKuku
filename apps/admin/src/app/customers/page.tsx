'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency, formatDate } from '@ecokuku/ui';
import {
  Users, Eye, Phone, ChevronDown, ChevronUp,
  UserPlus, AlertTriangle, Crown, RefreshCw, Star,
} from 'lucide-react';

interface Customer {
  id: string; name: string; email: string; phone: string;
  customerType?: string; location?: string;
  createdAt: string;
  totalSpent: number; orderCount: number;
  lastOrderDate: string | null; segment: string;
  pendingBalance: number;
  orders: { id: string; total: number; status: string; createdAt: string }[];
}

interface Stats {
  totalCustomers: number; newThisMonth: number; repeatThisMonth: number;
  repeatPct: number; withBalance: number;
}

interface Segments {
  VIP: number; REPEAT: number; AT_RISK: number; LAPSED: number; NEW: number;
}

const SEGMENT_CONFIG: Record<string, { label: string; color: string; icon?: React.ReactNode }> = {
  VIP: { label: 'VIP', color: 'bg-yellow-100 text-yellow-800', icon: <Crown size={11} /> },
  REPEAT: { label: 'Repeat', color: 'bg-green-100 text-green-700' },
  AT_RISK: { label: 'At Risk', color: 'bg-amber-100 text-amber-800', icon: <AlertTriangle size={11} /> },
  LAPSED: { label: 'Lapsed', color: 'bg-red-100 text-red-700' },
  NEW: { label: 'New', color: 'bg-blue-100 text-blue-700' },
};


type SortField = 'name' | 'totalSpent' | 'orderCount' | 'lastOrderDate' | 'createdAt';

export default function CustomersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [segments, setSegments] = useState<Segments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);
  useEffect(() => { if (session?.user) fetchCustomers(); }, [session, segmentFilter]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/customers', window.location.origin);
      url.searchParams.set('limit', '200');
      if (search) url.searchParams.set('search', search);
      if (segmentFilter) url.searchParams.set('segment', segmentFilter);
      const res = await fetch(url);
      const data = await res.json();
      setCustomers(data.data || []);
      setStats(data.stats || null);
      setSegments(data.segments || null);
    } catch { /* */ }
    finally { setIsLoading(false); }
  };

  const handleSearch = () => fetchCustomers();

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...customers].sort((a, b) => {
    let va: any, vb: any;
    switch (sortField) {
      case 'name': va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
      case 'totalSpent': va = a.totalSpent; vb = b.totalSpent; break;
      case 'orderCount': va = a.orderCount; vb = b.orderCount; break;
      case 'lastOrderDate': va = a.lastOrderDate || ''; vb = b.lastOrderDate || ''; break;
      default: va = a.createdAt; vb = b.createdAt;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none ${className || ''}`}
      onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );

  if (authStatus === 'loading') return <div className="p-8">Loading...</div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0">
          <h1 className="text-2xl font-bold">Customer Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track customers, segments, lifetime value, and outstanding balances</p>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Summary Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><Users size={16} className="text-green-700" /></div>
                  <p className="text-xs text-gray-500">Total Customers</p>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.totalCustomers}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><UserPlus size={16} className="text-blue-700" /></div>
                  <p className="text-xs text-gray-500">New This Month</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.newThisMonth}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><RefreshCw size={16} className="text-purple-700" /></div>
                  <p className="text-xs text-gray-500">Repeat This Month</p>
                </div>
                <p className="text-2xl font-bold text-purple-700">{stats.repeatPct}%</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{stats.repeatThisMonth} customers</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><AlertTriangle size={16} className="text-amber-700" /></div>
                  <p className="text-xs text-gray-500">With Balance</p>
                </div>
                <p className={`text-2xl font-bold ${stats.withBalance > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{stats.withBalance}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Outstanding orders</p>
              </div>
            </div>
          )}

          {/* Segment Filters */}
          {segments && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSegmentFilter('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!segmentFilter ? 'bg-green-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                All ({customers.length})
              </button>
              {Object.entries(SEGMENT_CONFIG).map(([key, cfg]) => {
                const count = segments[key as keyof Segments] || 0;
                return (
                  <button key={key} onClick={() => setSegmentFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${segmentFilter === key ? 'bg-green-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                    {cfg.icon} {cfg.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Search */}
          <div className="flex gap-3">
            <input type="text" placeholder="Search by name, email, or phone..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyUp={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            <button onClick={handleSearch} className="px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              Search
            </button>
          </div>

          {/* Customer Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading customers...</div>
            ) : sorted.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No customers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <SortHeader field="name">Name</SortHeader>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <SortHeader field="orderCount">Orders</SortHeader>
                      <SortHeader field="totalSpent">Lifetime Value</SortHeader>
                      <SortHeader field="lastOrderDate">Last Order</SortHeader>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((c) => {
                      const seg = SEGMENT_CONFIG[c.segment] || SEGMENT_CONFIG.NEW;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-sm text-gray-900">{c.name}</p>
                            {c.location && <p className="text-[10px] text-gray-400">{c.location}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-600 flex items-center gap-1"><Phone size={11} />{c.phone || '—'}</p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{c.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600">{c.customerType || '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{c.orderCount}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-800">{formatCurrency(c.totalSpent)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {c.lastOrderDate ? formatDate(new Date(c.lastOrderDate)) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${seg.color}`}>
                              {seg.icon} {seg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {c.pendingBalance > 0 ? (
                              <span className="text-sm font-semibold text-amber-700">{formatCurrency(c.pendingBalance)}</span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/customers/${c.id}`}
                              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-green-800 text-white rounded font-medium hover:bg-green-700">
                              <Eye size={12} /> Profile
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Marketing Segments Info */}
          {segments && (segments.AT_RISK > 0 || segments.LAPSED > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <Star size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Marketing Segments</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  {segments.AT_RISK > 0 && <><strong>{segments.AT_RISK}</strong> at-risk customers (no order in 30+ days). </>}
                  {segments.LAPSED > 0 && <><strong>{segments.LAPSED}</strong> lapsed customers (no order in 60+ days). </>}
                  Send targeted WhatsApp promotions or discount codes to bring them back.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
