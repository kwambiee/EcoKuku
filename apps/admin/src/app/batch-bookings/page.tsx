'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency, formatDate } from '@ecokuku/ui';
import { toast } from 'sonner';
import {
  Clock, CheckCircle, Package, Truck, XCircle, Send, ChevronDown, ChevronUp,
  AlertTriangle, ShoppingBag, Users, Calendar, ArrowRight, Phone,
} from 'lucide-react';

interface BatchOrder {
  id: string; orderNumber: string; batchId: string; quantity: number;
  pricePerChick: number; totalPrice: number;
  depositAmount: number; depositPaid: boolean; depositPaymentRef?: string;
  status: string; expectedReadyDate?: string; deliveryArea?: string; notes?: string;
  createdAt: string; updatedAt: string;
  customer: { id: string; name: string; email: string; phone: string };
  batch: { id: string; batchNumber: string; type: string; startDate: string; expectedReady?: string; currentCount: number; bookedCount: number; status: string };
  updates: { id: string; title: string; message: string; createdAt: string }[];
}

interface SupplyDemandItem {
  batchId: string; batchNumber: string; type: string; expectedReady?: string;
  availableSupply: number; totalBooked: number; surplus: number; isShort: boolean;
  bookings: { id: string; orderNumber: string; quantity: number; customerName: string; status: string }[];
}

interface Stats {
  openBookings: number; dueThisMonth: number; totalDeposit: number; fulfilledThisMonth: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING_PAYMENT: { label: 'Open', color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={13} /> },
  CONFIRMED: { label: 'Confirmed', color: 'bg-cyan-100 text-cyan-800', icon: <CheckCircle size={13} /> },
  GROWING: { label: 'Growing', color: 'bg-green-100 text-green-800', icon: <Package size={13} /> },
  READY: { label: 'Fulfilled', color: 'bg-amber-100 text-amber-800', icon: <Truck size={13} /> },
  COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-600', icon: <CheckCircle size={13} /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: <XCircle size={13} /> },
};

const STATUS_OPTIONS = ['PENDING_PAYMENT', 'CONFIRMED', 'GROWING', 'READY', 'COMPLETED', 'CANCELLED'];

function getNextStatuses(current: string): string[] {
  const flow: Record<string, string[]> = {
    PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['GROWING', 'CANCELLED'],
    GROWING: ['READY', 'CANCELLED'],
    READY: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };
  return flow[current] || [];
}

export default function BatchBookingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<BatchOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [supplyDemand, setSupplyDemand] = useState<SupplyDemandItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [modalOrder, setModalOrder] = useState<BatchOrder | null>(null);
  const [modalType, setModalType] = useState<'update' | 'convert' | 'cancel' | 'view' | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [linkBatchId, setLinkBatchId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showSupplyDemand, setShowSupplyDemand] = useState(true);

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);
  useEffect(() => { if (session?.user) fetchOrders(); }, [session, statusFilter]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/batch-orders?${params}`);
      const data = await res.json();
      setOrders(data.data || []);
      setStats(data.stats || null);
      setSupplyDemand(data.supplyDemand || []);
    } catch { toast.error('Failed to load bookings'); }
    finally { setIsLoading(false); }
  };

  const handleUpdateStatus = async () => {
    if (!modalOrder || !newStatus) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/batch-orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchOrderId: modalOrder.id,
          status: newStatus,
          updateMessage: updateMsg || undefined,
          batchId: linkBatchId || undefined,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Booking updated & customer notified');
      closeModal(); fetchOrders();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!modalOrder) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/batch-orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchOrderId: modalOrder.id,
          status: 'CANCELLED',
          refundNote: refundNote || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Booking cancelled');
      closeModal(); fetchOrders();
    } catch { toast.error('Failed to cancel'); }
    finally { setIsSubmitting(false); }
  };

  const handleConvertToOrder = async () => {
    if (!modalOrder) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/batch-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert_to_order', batchOrderId: modalOrder.id }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const data = await res.json();
      toast.success(`Converted to order ${data.orderNumber}`);
      closeModal(); fetchOrders();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to convert'); }
    finally { setIsSubmitting(false); }
  };

  const closeModal = () => {
    setModalOrder(null); setModalType(null); setNewStatus('');
    setUpdateMsg(''); setRefundNote(''); setLinkBatchId('');
  };

  const openUpdate = (o: BatchOrder) => {
    setModalOrder(o); setModalType('update'); setNewStatus(o.status); setUpdateMsg('');
    setLinkBatchId(o.batchId);
  };

  const openConvert = (o: BatchOrder) => { setModalOrder(o); setModalType('convert'); };
  const openCancel = (o: BatchOrder) => { setModalOrder(o); setModalType('cancel'); setRefundNote(''); };
  const openView = (o: BatchOrder) => { setModalOrder(o); setModalType('view'); };

  // Sorting
  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...orders].sort((a, b) => {
    let va: any, vb: any;
    switch (sortField) {
      case 'orderNumber': va = a.orderNumber; vb = b.orderNumber; break;
      case 'customer': va = a.customer.name; vb = b.customer.name; break;
      case 'quantity': va = a.quantity; vb = b.quantity; break;
      case 'expectedReadyDate': va = a.expectedReadyDate || ''; vb = b.expectedReadyDate || ''; break;
      case 'deposit': va = Number(a.depositAmount); vb = Number(b.depositAmount); break;
      case 'balance': va = Number(a.totalPrice) - Number(a.depositAmount); vb = Number(b.totalPrice) - Number(b.depositAmount); break;
      case 'status': va = a.status; vb = b.status; break;
      default: va = a.createdAt; vb = b.createdAt;
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
      onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );

  const shortBatches = supplyDemand.filter((s) => s.isShort);

  if (authStatus === 'loading') return <div className="p-8">Loading...</div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0">
          <h1 className="text-2xl font-bold">Batch Bookings</h1>
          <p className="text-gray-500 text-sm mt-1">Customer pre-orders for live birds and chicks — manage, confirm, and convert to orders</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Summary Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Clock size={16} className="text-blue-700" /></div>
                  <p className="text-xs text-gray-500">Open Bookings</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.openBookings}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Not yet fulfilled</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Calendar size={16} className="text-amber-700" /></div>
                  <p className="text-xs text-gray-500">Due This Month</p>
                </div>
                <p className="text-2xl font-bold text-amber-700">{stats.dueThisMonth}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Needs fulfilment</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><ShoppingBag size={16} className="text-green-700" /></div>
                  <p className="text-xs text-gray-500">Deposits Collected</p>
                </div>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalDeposit)}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><CheckCircle size={16} className="text-gray-600" /></div>
                  <p className="text-xs text-gray-500">Fulfilled This Month</p>
                </div>
                <p className="text-2xl font-bold text-gray-700">{stats.fulfilledThisMonth}</p>
              </div>
            </div>
          )}

          {/* Short supply alert */}
          {shortBatches.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 text-sm">Supply shortage alert</p>
                {shortBatches.map((s) => (
                  <p key={s.batchId} className="text-sm text-red-800 mt-0.5">
                    <strong>{s.batchNumber}</strong>: {s.totalBooked} booked but only {s.availableSupply} birds available (short by {Math.abs(s.surplus)})
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Supply vs Demand */}
          {supplyDemand.length > 0 && (
            <div className="bg-white rounded-xl border">
              <button onClick={() => setShowSupplyDemand(!showSupplyDemand)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-green-700" />
                  <h2 className="font-bold text-lg">Supply vs Demand</h2>
                  {shortBatches.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{shortBatches.length} short</span>
                  )}
                </div>
                {showSupplyDemand ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>
              {showSupplyDemand && (
                <div className="border-t p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600">Batch</th>
                          <th className="px-4 py-2 text-left text-gray-600">Type</th>
                          <th className="px-4 py-2 text-left text-gray-600">Expected Ready</th>
                          <th className="px-4 py-2 text-right text-gray-600">Available</th>
                          <th className="px-4 py-2 text-right text-gray-600">Booked</th>
                          <th className="px-4 py-2 text-right text-gray-600">Surplus</th>
                          <th className="px-4 py-2 text-left text-gray-600">Bookings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {supplyDemand.map((s) => (
                          <tr key={s.batchId} className={`hover:bg-gray-50 ${s.isShort ? 'bg-red-50/30' : ''}`}>
                            <td className="px-4 py-2.5 font-medium text-gray-900">{s.batchNumber}</td>
                            <td className="px-4 py-2.5 text-gray-500">{s.type}</td>
                            <td className="px-4 py-2.5 text-gray-500">
                              {s.expectedReady ? formatDate(new Date(s.expectedReady)) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold">{s.availableSupply}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{s.totalBooked}</td>
                            <td className={`px-4 py-2.5 text-right font-bold ${s.isShort ? 'text-red-600' : s.surplus === 0 ? 'text-amber-600' : 'text-green-600'}`}>
                              {s.surplus > 0 ? `+${s.surplus}` : s.surplus}
                            </td>
                            <td className="px-4 py-2.5">
                              {s.bookings.length === 0 ? (
                                <span className="text-gray-300 text-xs">None</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {s.bookings.slice(0, 3).map((b) => (
                                    <p key={b.id} className="text-[11px] text-gray-600">{b.customerName}: {b.quantity} birds</p>
                                  ))}
                                  {s.bookings.length > 3 && <p className="text-[10px] text-gray-400">+{s.bookings.length - 3} more</p>}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Shows active batches with expected ready dates vs total bookings against each batch.</p>
                </div>
              )}
            </div>
          )}

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!statusFilter ? 'bg-green-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
              All ({orders.length})
            </button>
            {STATUS_OPTIONS.map((s) => {
              const cfg = STATUS_CONFIG[s];
              const count = orders.filter((o) => o.status === s).length;
              if (!statusFilter && count === 0) return null;
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusFilter === s ? 'bg-green-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                  {cfg?.label || s} {!statusFilter && count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          {/* Bookings Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading bookings...</div>
            ) : sorted.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No batch bookings found</p>
                {statusFilter && <p className="text-sm mt-1">Try clearing the filter</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <SortHeader field="orderNumber">Booking Ref</SortHeader>
                      <SortHeader field="customer">Customer</SortHeader>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <SortHeader field="expectedReadyDate">Fulfilment Date</SortHeader>
                      <SortHeader field="deposit">Deposit</SortHeader>
                      <SortHeader field="balance">Balance</SortHeader>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Linked Batch</th>
                      <SortHeader field="status">Status</SortHeader>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((order) => {
                      const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-700', icon: null };
                      const balance = Number(order.totalPrice) - Number(order.depositAmount);
                      const nextStatuses = getNextStatuses(order.status);
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-mono text-sm font-medium text-gray-900">{order.orderNumber}</p>
                            <p className="text-[11px] text-gray-400">{formatDate(new Date(order.createdAt))}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 text-sm">{order.customer.name}</p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-0.5"><Phone size={10} />{order.customer.phone}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{order.batch.type}</p>
                            <p className="text-[11px] text-gray-400">{order.quantity} birds × {formatCurrency(Number(order.pricePerChick))}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {order.expectedReadyDate ? formatDate(new Date(order.expectedReadyDate)) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <p className={`text-sm font-semibold ${order.depositPaid ? 'text-green-700' : 'text-amber-700'}`}>
                              {formatCurrency(Number(order.depositAmount))}
                            </p>
                            {order.depositPaymentRef && <p className="text-[10px] text-gray-400 font-mono">{order.depositPaymentRef}</p>}
                            {!order.depositPaid && <p className="text-[10px] text-amber-600">Pending</p>}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                            {formatCurrency(balance)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{order.batch.batchNumber}</p>
                            <p className="text-[10px] text-gray-400">{order.batch.type}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              <button onClick={() => openView(order)}
                                className="text-[11px] px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 font-medium">
                                View
                              </button>
                              {nextStatuses.length > 0 && (
                                <button onClick={() => openUpdate(order)}
                                  className="text-[11px] px-2 py-1 border border-green-200 rounded text-green-700 hover:bg-green-50 font-medium">
                                  Update
                                </button>
                              )}
                              {order.status === 'READY' && (
                                <button onClick={() => openConvert(order)}
                                  className="text-[11px] px-2 py-1 bg-green-800 text-white rounded font-medium hover:bg-green-700 flex items-center gap-0.5">
                                  Convert <ArrowRight size={10} />
                                </button>
                              )}
                              {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                                <button onClick={() => openCancel(order)}
                                  className="text-[11px] px-2 py-1 border border-red-200 rounded text-red-600 hover:bg-red-50 font-medium">
                                  Cancel
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

        {/* VIEW MODAL */}
        {modalType === 'view' && modalOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4">
              <div className="p-5 border-b flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-lg">Booking {modalOrder.orderNumber}</h2>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${STATUS_CONFIG[modalOrder.status]?.color}`}>
                    {STATUS_CONFIG[modalOrder.status]?.icon} {STATUS_CONFIG[modalOrder.status]?.label}
                  </span>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Customer</p>
                    <p className="font-medium text-sm">{modalOrder.customer.name}</p>
                    <p className="text-xs text-gray-500">{modalOrder.customer.phone}</p>
                    <p className="text-xs text-gray-500">{modalOrder.customer.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Linked Batch</p>
                    <p className="font-medium text-sm">{modalOrder.batch.batchNumber}</p>
                    <p className="text-xs text-gray-500">{modalOrder.batch.type} · {modalOrder.batch.currentCount} birds</p>
                    {modalOrder.batch.expectedReady && <p className="text-xs text-gray-500">Ready: {formatDate(new Date(modalOrder.batch.expectedReady))}</p>}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Quantity:</span> <span className="font-semibold">{modalOrder.quantity} birds</span></div>
                  <div><span className="text-gray-500">Price/bird:</span> <span className="font-semibold">{formatCurrency(Number(modalOrder.pricePerChick))}</span></div>
                  <div><span className="text-gray-500">Total:</span> <span className="font-bold text-green-800">{formatCurrency(Number(modalOrder.totalPrice))}</span></div>
                  <div><span className="text-gray-500">Deposit:</span> <span className={`font-semibold ${modalOrder.depositPaid ? 'text-green-700' : 'text-amber-700'}`}>{formatCurrency(Number(modalOrder.depositAmount))}</span></div>
                  <div><span className="text-gray-500">Balance:</span> <span className="font-bold">{formatCurrency(Number(modalOrder.totalPrice) - Number(modalOrder.depositAmount))}</span></div>
                  {modalOrder.depositPaymentRef && <div><span className="text-gray-500">Ref:</span> <span className="font-mono text-xs">{modalOrder.depositPaymentRef}</span></div>}
                  {modalOrder.deliveryArea && <div><span className="text-gray-500">Delivery:</span> <span>{modalOrder.deliveryArea}</span></div>}
                  {modalOrder.expectedReadyDate && <div><span className="text-gray-500">Expected:</span> <span>{formatDate(new Date(modalOrder.expectedReadyDate))}</span></div>}
                </div>
                {modalOrder.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-0.5">Notes</p>
                    <p className="text-sm text-gray-600">{modalOrder.notes}</p>
                  </div>
                )}
                {modalOrder.updates.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">Timeline</p>
                    <div className="space-y-2">
                      {modalOrder.updates.map((u) => (
                        <div key={u.id} className="border-l-2 border-green-300 pl-3">
                          <p className="text-sm font-medium text-gray-900">{u.title}</p>
                          <p className="text-xs text-gray-500">{u.message}</p>
                          <p className="text-[10px] text-gray-400">{formatDate(new Date(u.createdAt))}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-5 border-t flex gap-3">
                {modalOrder.status === 'READY' && (
                  <button onClick={() => { closeModal(); setTimeout(() => openConvert(modalOrder), 100); }}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-1">
                    Convert to Order <ArrowRight size={14} />
                  </button>
                )}
                {getNextStatuses(modalOrder.status).length > 0 && (
                  <button onClick={() => { closeModal(); setTimeout(() => openUpdate(modalOrder), 100); }}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                    Update Status
                  </button>
                )}
                <button onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UPDATE STATUS MODAL */}
        {modalType === 'update' && modalOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-lg">Update {modalOrder.orderNumber}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{modalOrder.customer.name} · {modalOrder.quantity} birds</p>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-4">
                {/* Quick status buttons */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Move to</label>
                  <div className="flex gap-2">
                    {getNextStatuses(modalOrder.status).filter((s) => s !== 'CANCELLED').map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button key={s} onClick={() => setNewStatus(s)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition ${
                            newStatus === s ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}>
                          {cfg?.label || s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {newStatus === 'CONFIRMED' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    Confirming links this booking to batch <strong>{modalOrder.batch.batchNumber}</strong>. The customer will be notified.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Message to Customer <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea value={updateMsg} onChange={(e) => setUpdateMsg(e.target.value)}
                    rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="e.g. Your chicks are growing well and on track for delivery..." />
                </div>
              </div>
              <div className="p-5 border-t flex gap-3">
                <button onClick={handleUpdateStatus} disabled={isSubmitting || newStatus === modalOrder.status}
                  className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                  <Send size={14} /> {isSubmitting ? 'Saving...' : 'Save & Notify'}
                </button>
                <button onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONVERT TO ORDER MODAL */}
        {modalType === 'convert' && modalOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b">
                <h2 className="font-bold text-lg">Convert to Order</h2>
                <p className="text-xs text-gray-400 mt-0.5">{modalOrder.orderNumber} → Regular order</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Customer</span><span className="font-medium">{modalOrder.customer.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Product</span><span className="font-medium">{modalOrder.batch.type} × {modalOrder.quantity}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Total price</span><span className="font-semibold">{formatCurrency(Number(modalOrder.totalPrice))}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Deposit paid</span><span className="font-semibold text-green-700">-{formatCurrency(Number(modalOrder.depositAmount))}</span></div>
                  <hr />
                  <div className="flex justify-between text-base"><span className="font-semibold">Balance due</span><span className="font-bold text-green-800">{formatCurrency(Number(modalOrder.totalPrice) - Number(modalOrder.depositAmount))}</span></div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">This will create a new order with status &quot;Processing&quot;, deduct {modalOrder.quantity} birds from batch {modalOrder.batch.batchNumber}, and mark this booking as completed.</p>
                </div>
              </div>
              <div className="p-5 border-t flex gap-3">
                <button onClick={handleConvertToOrder} disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm flex items-center justify-center gap-1">
                  {isSubmitting ? 'Converting...' : 'Convert to Order'} <ArrowRight size={14} />
                </button>
                <button onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CANCEL WITH REFUND MODAL */}
        {modalType === 'cancel' && modalOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="p-5 border-b">
                <h2 className="font-bold text-lg text-red-800">Cancel Booking</h2>
                <p className="text-xs text-gray-400 mt-0.5">{modalOrder.orderNumber} · {modalOrder.customer.name}</p>
              </div>
              <div className="p-5 space-y-4">
                {Number(modalOrder.depositAmount) > 0 && modalOrder.depositPaid && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">Customer has paid a deposit of <strong>{formatCurrency(Number(modalOrder.depositAmount))}</strong>. Record the refund details below.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Refund / Cancellation Note</label>
                  <textarea value={refundNote} onChange={(e) => setRefundNote(e.target.value)}
                    rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="e.g. Full refund processed via M-Pesa on 24/06/2026. Ref: SHK..." />
                </div>
              </div>
              <div className="p-5 border-t flex gap-3">
                <button onClick={handleCancel} disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 text-sm">
                  {isSubmitting ? 'Cancelling...' : 'Cancel Booking'}
                </button>
                <button onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
