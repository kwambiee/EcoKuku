'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency, formatDate } from '@ecokuku/ui';
import { Mail, Phone, Users, Eye, ArrowUpDown } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  orders: Array<{
    id: string;
    total: number;
    status: string;
  }>;
}

type SortOption = 'recent' | 'total_spent' | 'order_count';

function getCustomerTier(totalSpent: number, orderCount: number) {
  if (totalSpent >= 50000 || orderCount >= 10) return 'Gold';
  if (totalSpent >= 25000 || orderCount >= 5) return 'Silver';
  return 'Regular';
}

const TIER_COLORS: Record<string, string> = {
  Gold: 'bg-yellow-100 text-yellow-800',
  Silver: 'bg-gray-100 text-gray-700',
  Regular: 'bg-green-100 text-green-700',
};

export default function CustomersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchCustomers();
    }
  }, [session]);

  const fetchCustomers = async () => {
    try {
      const url = new URL('/api/customers', window.location.origin);
      if (search) {
        url.searchParams.set('search', search);
      }

      const response = await fetch(url);
      const data = await response.json();
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalSpent = (orders: Customer['orders']) => {
    return orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    switch (sortBy) {
      case 'total_spent':
        return getTotalSpent(b.orders) - getTotalSpent(a.orders);
      case 'order_count':
        return b.orders.length - a.orders.length;
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (status === 'loading') {
    return (
      <div className="p-8">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <p className="text-gray-600 mt-1">View and manage registered customers</p>
      </div>
      <div className="p-6">
      {/* Stats */}
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-5 py-4 mb-6">
        <Users size={24} className="text-green-700" />
        <div>
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
          <p className="text-sm text-gray-600">registered customers</p>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyUp={() => fetchCustomers()}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <ArrowUpDown size={16} className="text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
          >
            <option value="recent">Most Recent</option>
            <option value="total_spent">Total Spent</option>
            <option value="order_count">Order Count</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No customers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['Name', 'Email', 'Phone', 'Tier', 'Orders', 'Total Spent', 'Member Since', 'Latest Order', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCustomers.map((customer) => {
                  const totalSpent = getTotalSpent(customer.orders);
                  const tier = getCustomerTier(totalSpent, customer.orders.length);
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{customer.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Mail size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{customer.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-gray-400 flex-shrink-0" />
                          {customer.phone || '---'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[tier]}`}>
                          {tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-center text-gray-900">
                        {customer.orders.length}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-900">
                        {formatCurrency(totalSpent)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(new Date(customer.createdAt))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {customer.orders.length > 0 ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${customer.orders[0].status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {customer.orders[0].status.replace(/_/g, ' ')}
                          </span>
                        ) : '---'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-800 hover:bg-green-900 rounded-lg transition-colors"
                        >
                          <Eye size={14} />
                          View
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
      </div>
      </main>
    </div>
  );
}
