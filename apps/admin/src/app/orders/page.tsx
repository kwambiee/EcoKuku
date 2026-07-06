'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency, formatDate } from '@ecokuku/ui';
import { toast } from 'sonner';
import {
  Eye, Edit2, Package, User, MapPin, Truck,
  ShoppingBag, Clock, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, Phone,
} from 'lucide-react';

interface OrderItem {
  id: string; quantity: number; price: number; subtotal: number;
  product: { id: string; name: string; type: string; image?: string; unit?: string };
}

interface Order {
  id: string; orderNumber: string;
  customer: { id: string; name: string; email: string; phone: string };
  items: OrderItem[];
  total: number; subtotal: number; deliveryFee: number; discountAmount: number;
  orderType: string; status: string; paymentMethod: string; paymentRef?: string;
  notes?: string; driverId?: string;
  driver?: { id: string; name: string; phone: string; vehicle: string };
  delivery?: { id: string; status: string; scheduledDate: string; actualDate?: string };
  createdAt: string; deliveryDate?: string; deliveryArea?: string; deliveryAddress?: string;
}

interface Driver {
  id: string; name: string; phone: string; vehicle: string; active: boolean;
}

interface Stats {
  newToday: number; outForDelivery: number; deliveredToday: number; cancelledWeek: number;
}

const STATUS_PIPELINE = [
  { value: 'PENDING', label: 'Pending', desc: 'Customer placed, not confirmed', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'CONFIRMED', label: 'Confirmed', desc: 'Admin accepted the order', color: 'bg-cyan-100 text-cyan-800', icon: CheckCircle2 },
  { value: 'PROCESSING', label: 'Processing', desc: 'Being packed / prepared', color: 'bg-blue-100 text-blue-800', icon: Package },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Assigned to driver', color: 'bg-purple-100 text-purple-800', icon: Truck },
  { value: 'DELIVERED', label: 'Delivered', desc: 'Confirmed received', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  { value: 'CANCELLED', label: 'Cancelled', desc: 'By customer or admin', color: 'bg-red-100 text-red-800', icon: XCircle },
];

const ALL_STATUSES = ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'FAILED'];

function getStatusStyle(s: string) {
  return STATUS_PIPELINE.find((p) => p.value === s) || { value: s, label: s.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-800' };
}

function getNextStatuses(current: string): string[] {
  const flow: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PAID: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: [],
    FAILED: [],
  };
  return flow[current] || [];
}

export default function OrdersPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', driverId: '', notes: '', paymentRef: '' });

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);
  useEffect(() => { if (session?.user) { fetchOrders(); fetchDrivers(); } }, [session, statusFilter]);

  const fetchOrders = async () => {
    try {
      const url = new URL('/api/orders', window.location.origin);
      url.searchParams.set('limit', '100');
      if (statusFilter) url.searchParams.set('status', statusFilter);
      const res = await fetch(url);
      const data = await res.json();
      setOrders(data.data || []);
      setStats(data.stats || null);
    } catch { toast.error('Failed to load orders'); }
    finally { setIsLoading(false); }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      const data = await res.json();
      setDrivers((data.data || []).filter((d: Driver) => d.active));
    } catch { /* ignore */ }
  };

  const handleView = (order: Order) => { setSelectedOrder(order); setShowViewModal(true); };

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setEditForm({ status: order.status, driverId: order.driverId || '', notes: order.notes || '', paymentRef: order.paymentRef || '' });
    setShowEditModal(true);
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          status: editForm.status,
          driverId: editForm.driverId || undefined,
          notes: editForm.notes || undefined,
          paymentRef: editForm.paymentRef || undefined,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
      const warningParts: string[] = [];
      if (editForm.status === 'PROCESSING' && selectedOrder.status !== 'PROCESSING') warningParts.push('Inventory deducted');
      if (editForm.status === 'DELIVERED' && selectedOrder.status !== 'DELIVERED') warningParts.push('Delivery confirmed');
      toast.success(`Order updated to ${editForm.status.replace(/_/g, ' ')}${warningParts.length ? ` — ${warningParts.join(', ')}` : ''}`);
      setShowEditModal(false); setShowViewModal(false); setSelectedOrder(null);
      fetchOrders();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to update'); }
    finally { setIsUpdating(false); }
  };

  const quickStatusUpdate = async (order: Order, newStatus: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success(`${order.orderNumber} → ${newStatus.replace(/_/g, ' ')}`);
      fetchOrders();
    } catch { toast.error('Failed to update'); }
  };

  const statusCounts: Record<string, number> = {};
  orders.forEach((o) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  if (authStatus === 'loading') return <div className="p-8">Loading...</div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0">
          <h1 className="text-2xl font-bold">Order Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track, manage and fulfill customer orders</p>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Summary Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock size={16} className="text-yellow-700" />
                  </div>
                  <p className="text-xs text-gray-500">New Orders Today</p>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{stats.newToday}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Needs action</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Truck size={16} className="text-purple-700" />
                  </div>
                  <p className="text-xs text-gray-500">Out for Delivery</p>
                </div>
                <p className="text-2xl font-bold text-purple-700">{stats.outForDelivery}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">In transit now</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={16} className="text-green-700" />
                  </div>
                  <p className="text-xs text-gray-500">Delivered Today</p>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.deliveredToday}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <XCircle size={16} className="text-red-700" />
                  </div>
                  <p className="text-xs text-gray-500">Cancelled / Failed</p>
                </div>
                <p className="text-2xl font-bold text-red-700">{stats.cancelledWeek}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">This week</p>
              </div>
            </div>
          )}

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!statusFilter ? 'bg-green-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
              All ({orders.length})
            </button>
            {STATUS_PIPELINE.map((s) => {
              const count = statusFilter ? (statusCounts[s.value] || 0) : (orders.filter((o) => o.status === s.value).length);
              return (
                <button key={s.value} onClick={() => setStatusFilter(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusFilter === s.value ? 'bg-green-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                  {s.label} {!statusFilter && count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No orders found</p>
                {statusFilter && <p className="text-sm mt-1">Try clearing the filter</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Order</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Items</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Payment</th>
                      <th className="px-4 py-3 text-left">Delivery</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Driver</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => {
                      const st = getStatusStyle(order.status);
                      const nextStatuses = getNextStatuses(order.status);
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900 text-sm">{order.orderNumber}</p>
                            <p className="text-[11px] text-gray-400">{formatDate(new Date(order.createdAt))}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 text-sm">{order.customer?.name || '—'}</p>
                            <p className="text-[11px] text-gray-400">{order.customer?.phone || ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5 max-w-[200px]">
                              {(order.items || []).slice(0, 2).map((item) => (
                                <p key={item.id} className="text-xs text-gray-600 truncate">{item.product?.name} × {item.quantity}</p>
                              ))}
                              {(order.items?.length || 0) > 2 && <p className="text-[10px] text-gray-400">+{order.items.length - 2} more</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-500">{order.orderType}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-semibold text-sm text-green-800">{formatCurrency(Number(order.total))}</p>
                            {Number(order.deliveryFee) > 0 && <p className="text-[10px] text-gray-400">+{formatCurrency(Number(order.deliveryFee))} delivery</p>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-700">{order.paymentMethod}</p>
                            {order.paymentRef ? (
                              <p className="text-[10px] text-green-600 font-mono">{order.paymentRef}</p>
                            ) : (
                              <p className="text-[10px] text-amber-600">No ref</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-gray-700">{order.deliveryArea || '—'}</p>
                            {order.deliveryDate && <p className="text-[10px] text-gray-400">{formatDate(new Date(order.deliveryDate))}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {order.driver ? (
                              <p className="text-xs text-gray-700">{order.driver.name}</p>
                            ) : (
                              <p className="text-xs text-gray-300">—</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleView(order)} className="p-1.5 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded" title="View details">
                                <Eye size={15} />
                              </button>
                              <button onClick={() => handleEdit(order)} className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded" title="Edit status">
                                <Edit2 size={15} />
                              </button>
                              {nextStatuses.length > 0 && nextStatuses[0] !== 'CANCELLED' && (
                                <button onClick={() => quickStatusUpdate(order, nextStatuses[0])}
                                  className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded" title={`Move to ${nextStatuses[0].replace(/_/g, ' ')}`}>
                                  <ChevronRight size={15} />
                                </button>
                              )}
                            </div>
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

        {/* VIEW ORDER MODAL */}
        {showViewModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4">
              <div className="p-5 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Order {selectedOrder.orderNumber}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(selectedOrder.status).color}`}>
                      {getStatusStyle(selectedOrder.status).label}
                    </span>
                    <span className="text-xs text-gray-400">{selectedOrder.orderType}</span>
                    <span className="text-xs text-gray-400">{formatDate(new Date(selectedOrder.createdAt))}</span>
                  </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Customer & Delivery - two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                      <User size={14} /> Customer
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-900 font-medium">{selectedOrder.customer?.name}</p>
                      <p className="text-gray-500 flex items-center gap-1"><Phone size={12} />{selectedOrder.customer?.phone || '—'}</p>
                      <p className="text-gray-500">{selectedOrder.customer?.email || '—'}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                      <MapPin size={14} /> Delivery
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-900">{selectedOrder.deliveryArea || '—'}</p>
                      <p className="text-gray-500">{selectedOrder.deliveryAddress || '—'}</p>
                      <p className="text-gray-500">
                        Requested: {selectedOrder.deliveryDate ? formatDate(new Date(selectedOrder.deliveryDate)) : '—'}
                      </p>
                      {selectedOrder.driver && (
                        <p className="text-gray-700 flex items-center gap-1"><Truck size={12} /> {selectedOrder.driver.name} ({selectedOrder.driver.phone})</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-sm text-gray-900 mb-2">Payment</h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div><span className="text-gray-500">Method:</span> <span className="font-medium">{selectedOrder.paymentMethod}</span></div>
                    <div><span className="text-gray-500">Ref:</span> <span className="font-mono text-green-700">{selectedOrder.paymentRef || '—'}</span></div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
                    <Package size={14} /> Items ({selectedOrder.items?.length || 0})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full min-w-max text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600">Product</th>
                          <th className="px-4 py-2 text-right text-gray-600">Qty</th>
                          <th className="px-4 py-2 text-right text-gray-600">Price</th>
                          <th className="px-4 py-2 text-right text-gray-600">Subtotal</th>
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
                      <tfoot className="bg-gray-50 border-t text-sm">
                        <tr><td colSpan={3} className="px-4 py-1.5 text-right text-gray-500">Subtotal</td><td className="px-4 py-1.5 text-right">{formatCurrency(Number(selectedOrder.subtotal))}</td></tr>
                        {Number(selectedOrder.deliveryFee) > 0 && (
                          <tr><td colSpan={3} className="px-4 py-1.5 text-right text-gray-500">Delivery fee</td><td className="px-4 py-1.5 text-right">{formatCurrency(Number(selectedOrder.deliveryFee))}</td></tr>
                        )}
                        {Number(selectedOrder.discountAmount) > 0 && (
                          <tr><td colSpan={3} className="px-4 py-1.5 text-right text-gray-500">Discount</td><td className="px-4 py-1.5 text-right text-red-600">-{formatCurrency(Number(selectedOrder.discountAmount))}</td></tr>
                        )}
                        <tr className="border-t"><td colSpan={3} className="px-4 py-2 text-right font-bold">Total</td><td className="px-4 py-2 text-right font-bold text-green-800">{formatCurrency(Number(selectedOrder.total))}</td></tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-sm text-gray-900 mb-1">Notes</h3>
                    <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Status Pipeline Visual */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-sm text-gray-900 mb-3">Order Pipeline</h3>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {STATUS_PIPELINE.filter((s) => s.value !== 'CANCELLED').map((s, i) => {
                      const isActive = selectedOrder.status === s.value;
                      const isPast = STATUS_PIPELINE.findIndex((p) => p.value === selectedOrder.status) > i;
                      return (
                        <div key={s.value} className="flex items-center gap-1 flex-shrink-0">
                          <div className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${isActive ? s.color + ' ring-2 ring-offset-1 ring-gray-300' : isPast ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            {s.label}
                          </div>
                          {i < STATUS_PIPELINE.filter((ss) => ss.value !== 'CANCELLED').length - 1 && (
                            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t flex justify-between">
                <button onClick={() => { setShowViewModal(false); handleEdit(selectedOrder); }}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2">
                  <Edit2 size={14} /> Update Status
                </button>
                <button onClick={() => setShowViewModal(false)}
                  className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT ORDER MODAL */}
        {showEditModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-lg">Update Order {selectedOrder.orderNumber}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Current: {getStatusStyle(selectedOrder.status).label}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-4">
                {/* Quick status buttons */}
                {getNextStatuses(selectedOrder.status).length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quick Status Update</label>
                    <div className="flex gap-2">
                      {getNextStatuses(selectedOrder.status).map((ns) => {
                        const style = getStatusStyle(ns);
                        const isCancelBtn = ns === 'CANCELLED';
                        return (
                          <button key={ns} onClick={() => setEditForm({ ...editForm, status: ns })}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition ${
                              editForm.status === ns
                                ? isCancelBtn ? 'border-red-500 bg-red-50 text-red-700' : 'border-green-600 bg-green-50 text-green-800'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}>
                            {style.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All statuses dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Order Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>

                {/* Warning banners */}
                {editForm.status === 'PROCESSING' && selectedOrder.status !== 'PROCESSING' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800">Moving to Processing will <strong>auto-deduct inventory</strong> for all items in this order.</p>
                  </div>
                )}
                {editForm.status === 'CANCELLED' && ['PROCESSING', 'PACKED'].includes(selectedOrder.status) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">Cancelling will <strong>restore inventory</strong> that was deducted.</p>
                  </div>
                )}

                {/* Driver assignment */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Truck size={14} /> Assign Driver
                  </label>
                  <select value={editForm.driverId} onChange={(e) => setEditForm({ ...editForm, driverId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">No driver assigned</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.vehicle}</option>)}
                  </select>
                </div>

                {/* M-Pesa ref */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">M-Pesa / Payment Ref</label>
                  <input type="text" value={editForm.paymentRef} onChange={(e) => setEditForm({ ...editForm, paymentRef: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" placeholder="e.g. SHK2X5B7R9" />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Internal Notes</label>
                  <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="e.g. Customer wants morning delivery" />
                </div>
              </div>
              <div className="p-5 border-t flex gap-3">
                <button onClick={handleUpdateOrder} disabled={isUpdating || editForm.status === selectedOrder.status}
                  className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm">
                  {isUpdating ? 'Updating...' : 'Update Order'}
                </button>
                <button onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
