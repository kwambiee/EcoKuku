'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@ecokuku/ui';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@ecokuku/ui';

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  items: any[];
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: '',
      });

      fetchOrders();
    }
  }, [session]);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name }),
      });
      if (res.ok) {
        setIsEditing(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update profile');
      }
    } catch {
      alert('An error occurred. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <Button variant="secondary" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Profile</h2>

              {!isEditing ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{formData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{formData.email}</p>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full text-center text-green-900 hover:text-green-800 font-medium"
                  >
                    Edit Profile
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 bg-gray-100"
                      disabled
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsEditing(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Orders */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order History</h2>

              {isLoading ? (
                <p className="text-gray-600">Loading orders...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No orders yet</p>
                  <Link href="/shop">
                    <Button>Start Shopping</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-green-900 transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {order.orderNumber || `#${order.id.substring(0, 8)}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(new Date(order.createdAt))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-900">
                            {formatCurrency(Number(order.total))}
                          </p>
                          <p className="text-sm text-gray-600 capitalize">{order.status}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>

                      <Link href={`/orders/${order.id}`}>
                        <button className="text-sm text-green-900 hover:text-green-800 font-medium">
                          View Details →
                        </button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
