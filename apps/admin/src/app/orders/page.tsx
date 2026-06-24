'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Badge, formatCurrency } from '@ecokuku/ui';
import { formatDate } from '@ecokuku/ui';
import { Eye, Edit2, X, Package, User, MapPin, Truck } from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    type: string;
    image?: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  total: number;
  status: string;
  notes?: string;
  driverId?: string;
  createdAt: string;
  deliveryDate: string;
  deliveryArea: string;
  deliveryAddress?: string;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  active: boolean;
}

const STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', driverId: '', notes: '' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchOrders();
      fetchDrivers();
    }
  }, [session, statusFilter]);

  const fetchOrders = async () => {
    try {
      const url = new URL('/api/orders', window.location.origin);
      url.searchParams.set('limit', '100');
      if (statusFilter) {
        url.searchParams.set('status', statusFilter);
      }
      const response = await fetch(url);
      const data = await response.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/drivers');
      const data = await response.json();
      setDrivers((data.data || []).filter((d: Driver) => d.active));
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const handleView = (order: Order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status,
      driverId: order.driverId || '',
      notes: order.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: editForm.status,
          driverId: editForm.driverId || undefined,
          notes: editForm.notes || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to update order');
      toast.success('Order updated successfully');
      setShowEditModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch {
      toast.error('Failed to update order');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAID':
        return 'bg-cyan-100 text-cyan-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'PACKED':
        return 'bg-indigo-100 text-indigo-800';
      case 'OUT_FOR_DELIVERY':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
        <h1 className="text-3xl font-bold">Order Management</h1>
        <p className="text-gray-600 mt-1">View and manage customer orders</p>
      </div>
      <div className="p-6">

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            statusFilter === ''
              ? 'bg-green-900 text-white'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              statusFilter === s
                ? 'bg-green-900 text-white'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{order.customer?.name || '—'}</p>
                        <p className="text-sm text-gray-600">{order.customer?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 font-semibold text-green-900">
                      {formatCurrency(Number(order.total))}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{order.deliveryArea || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(new Date(order.createdAt))}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(order)}
                          className="text-green-900 hover:text-green-800 p-1"
                          title="View order details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(order)}
                          className="text-blue-900 hover:text-blue-800 p-1"
                          title="Update order status"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Order {selectedOrder.orderNumber}</h2>
                <Badge className={getStatusColor(selectedOrder.status)}>
                  {selectedOrder.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <User size={16} /> Customer
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Name:</span> {selectedOrder.customer?.name}</div>
                  <div><span className="text-gray-500">Email:</span> {selectedOrder.customer?.email}</div>
                  <div><span className="text-gray-500">Phone:</span> {selectedOrder.customer?.phone}</div>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin size={16} /> Delivery
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Area:</span> {selectedOrder.deliveryArea || '—'}</div>
                  <div><span className="text-gray-500">Address:</span> {selectedOrder.deliveryAddress || '—'}</div>
                  <div>
                    <span className="text-gray-500">Delivery Date:</span>{' '}
                    {selectedOrder.deliveryDate ? formatDate(new Date(selectedOrder.deliveryDate)) : '—'}
                  </div>
                  <div>
                    <span className="text-gray-500">Ordered:</span>{' '}
                    {formatDate(new Date(selectedOrder.createdAt))}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Package size={16} /> Items ({selectedOrder.items?.length || 0})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-700">Product</th>
                        <th className="px-4 py-2 text-right text-gray-700">Qty</th>
                        <th className="px-4 py-2 text-right text-gray-700">Price</th>
                        <th className="px-4 py-2 text-right text-gray-700">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(selectedOrder.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-gray-900">{item.product?.name || 'Unknown'}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(Number(item.price))}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(Number(item.subtotal))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-semibold">Total</td>
                        <td className="px-4 py-2 text-right font-bold text-green-900">
                          {formatCurrency(Number(selectedOrder.total))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Notes</h3>
                  <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(selectedOrder);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Status
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Update Order {selectedOrder.orderNumber}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Truck size={14} /> Assign Driver
                </label>
                <select
                  value={editForm.driverId}
                  onChange={(e) => setEditForm({ ...editForm, driverId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">No driver assigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.vehicle}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Add a note about this order..."
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">Status Flow</p>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {STATUSES.filter(s => s !== 'CANCELLED').map((s, i) => (
                    <span key={s} className="flex items-center gap-1">
                      <span className={editForm.status === s ? 'font-bold text-green-900' : ''}>{s.replace(/_/g, ' ')}</span>
                      {i < STATUSES.filter(ss => ss !== 'CANCELLED').length - 1 && <span>→</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOrder}
                disabled={isUpdating}
                className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Update Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}
