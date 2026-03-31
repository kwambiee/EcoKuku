'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@ecokuku/ui';
import { Eye, Mail, Phone } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  orders: Array<{
    id: string;
    totalPrice: number;
    status: string;
  }>;
}

export default function CustomersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    return orders.reduce((total, order) => total + order.totalPrice, 0);
  };

  if (status === 'loading') {
    return (
      <div className="p-8">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Customer Management</h1>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyUp={() => fetchCustomers()}
          className="w-full rounded-lg border border-gray-300 px-4 py-2"
        />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Member Since
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      {customer.email}
                    </td>
                    <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {customer.orders.length}
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-900">
                      {formatCurrency(getTotalSpent(customer.orders))}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(new Date(customer.createdAt))}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-green-900 hover:text-green-800 p-1">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
