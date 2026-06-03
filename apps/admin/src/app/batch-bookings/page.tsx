'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@ecokuku/ui';
import { Users, ChevronDown, CheckCircle, Clock, Truck, Package, X, Send } from 'lucide-react';

interface BatchOrder {
  id: string;
  orderNumber: string;
  quantity: number;
  totalPrice: number;
  depositPaid: boolean;
  status: string;
  createdAt: string;
  expectedReadyDate?: string;
  deliveryArea?: string;
  customer: { name: string; email: string; phone: string };
  batch: { batchNumber: string; type: string; startDate: string; expectedReady?: string };
  updates: { id: string; title: string; createdAt: string }[];
}

const STATUS_OPTIONS = ['CONFIRMED', 'GROWING', 'READY', 'COMPLETED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  CONFIRMED:       'bg-cyan-100 text-cyan-800',
  GROWING:         'bg-green-100 text-green-800',
  READY:           'bg-amber-100 text-amber-800',
  COMPLETED:       'bg-gray-100 text-gray-800',
  CANCELLED:       'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING_PAYMENT: <Clock size={14} />,
  CONFIRMED:       <CheckCircle size={14} />,
  GROWING:         <Package size={14} />,
  READY:           <Truck size={14} />,
  COMPLETED:       <CheckCircle size={14} />,
  CANCELLED:       <X size={14} />,
};

export default function BatchBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<BatchOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [modalOrder, setModalOrder] = useState<BatchOrder | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) fetchOrders();
  }, [session, statusFilter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/batch-orders?${params}`);
      const data = await res.json();
      setOrders(data.data || []);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!modalOrder || !newStatus) return;
    setUpdating(modalOrder.id);
    try {
      const res = await fetch('/api/batch-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchOrderId: modalOrder.id,
          status: newStatus,
          updateMessage: updateMsg || undefined,
        }),
      });
      if (res.ok) {
        setModalOrder(null);
        setUpdateMsg('');
        setNewStatus('');
        fetchOrders();
      }
    } finally {
      setUpdating(null);
    }
  };

  const stats = {
    total: orders.length,
    confirmed: orders.filter((o) => o.status === 'CONFIRMED').length,
    growing: orders.filter((o) => o.status === 'GROWING').length,
    ready: orders.filter((o) => o.status === 'READY').length,
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Batch Bookings</h1>
          <p className="text-gray-600 mt-1">Customer pre-orders for chick rearing</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Bookings', value: stats.total, color: 'bg-gray-50 border-gray-200' },
          { label: 'Confirmed', value: stats.confirmed, color: 'bg-cyan-50 border-cyan-200' },
          { label: 'Growing', value: stats.growing, color: 'bg-green-50 border-green-200' },
          { label: 'Ready', value: stats.ready, color: 'bg-amber-50 border-amber-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-4 ${s.color}`}>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'PENDING_PAYMENT', 'CONFIRMED', 'GROWING', 'READY', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              statusFilter === s
                ? 'bg-green-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No batch bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Order #', 'Customer', 'Batch', 'Qty', 'Deposit', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{order.customer.name}</p>
                      <p className="text-xs text-gray-500">{order.customer.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{order.batch.batchNumber}</p>
                      <p className="text-xs text-gray-500">{order.batch.type}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{order.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.depositPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {order.depositPaid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_ICONS[order.status]}
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(new Date(order.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setModalOrder(order); setNewStatus(order.status); }}
                        className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium border border-green-200 px-2 py-1 rounded"
                      >
                        Update <ChevronDown size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {modalOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Update {modalOrder.orderNumber}</h3>
                <button onClick={() => setModalOrder(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Customer: {modalOrder.customer.name} · {modalOrder.quantity} chicks
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message to Customer <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={updateMsg}
                  onChange={(e) => setUpdateMsg(e.target.value)}
                  rows={3}
                  placeholder="e.g. Your chicks are growing well and on track..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating === modalOrder.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-800 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  <Send size={16} /> {updating === modalOrder.id ? 'Saving...' : 'Save & Notify'}
                </button>
                <button
                  onClick={() => setModalOrder(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
