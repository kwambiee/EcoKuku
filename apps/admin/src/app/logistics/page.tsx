'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { formatCurrency, formatDate } from '@ecokuku/ui';
import { toast } from 'sonner';
import {
  Truck, MapPin, User, RefreshCw, ChevronDown, ChevronUp, Plus,
  ToggleLeft, ToggleRight, Trash2, Phone, CheckCircle,
  MessageSquare, AlertTriangle,
} from 'lucide-react';

interface OrderItem {
  id: string; quantity: number; price: number;
  product: { name: string; unit?: string };
}

interface Driver {
  id: string; name: string; phone: string; vehicle: string; plate: string; active: boolean;
  completedToday?: number; activeDeliveries?: number; driverStatus?: string;
}

interface Delivery {
  id: string; status: string; scheduledDate: string; actualDate?: string; driverId?: string;
  location?: string; notes?: string;
  order: {
    id: string; orderNumber: string; total: number; deliveryFee: number;
    deliveryAddress?: string; deliveryArea?: string; deliveryDate?: string;
    customer: { name: string; phone: string; email?: string };
    items: OrderItem[];
  };
  driver?: Driver;
}

interface Stats {
  toAssign: number; outForDelivery: number; completedToday: number; availableDrivers: number;
}

const DELIVERY_STATUSES = [
  { value: 'SCHEDULED', label: 'Unassigned', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PROCESSING', label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
  { value: 'PACKED', label: 'Packed', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'OUT_FOR_DELIVERY', label: 'Picked Up', color: 'bg-purple-100 text-purple-800' },
  { value: 'DELIVERED', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'FAILED', label: 'Failed', color: 'bg-red-100 text-red-800' },
];

function getStatusStyle(s: string) {
  return DELIVERY_STATUSES.find((ds) => ds.value === s) || { value: s, label: s.replace(/_/g, ' '), color: 'bg-gray-100 text-gray-700' };
}

const DRIVER_EMPTY = { name: '', phone: '', vehicle: 'Motorbike', plate: '' };
const DRIVER_STATUS_STYLES: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: 'bg-green-100 text-green-700' },
  ON_DELIVERY: { label: 'On Delivery', color: 'bg-purple-100 text-purple-700' },
  OFF_DUTY: { label: 'Off Duty', color: 'bg-gray-100 text-gray-500' },
};

export default function LogisticsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [assignModal, setAssignModal] = useState<Delivery | null>(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [showDriverPanel, setShowDriverPanel] = useState(true);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState(DRIVER_EMPTY);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);
  useEffect(() => { if (session?.user) fetchData(); }, [session]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [logRes, drvRes] = await Promise.all([fetch('/api/logistics'), fetch('/api/drivers')]);
      const logData = await logRes.json();
      const drvData = await drvRes.json();
      setDeliveries(logData.deliveries || []);
      setDrivers(logData.drivers || drvData.data || []);
      setStats(logData.stats || null);
    } catch { toast.error('Failed to load logistics data'); }
    finally { setIsLoading(false); }
  };

  const updateDelivery = async (deliveryId: string, patch: { driverId?: string; status?: string }) => {
    setUpdating(deliveryId);
    try {
      const res = await fetch('/api/logistics', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId, ...patch }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const smsResults: string[] = data.smsResults || [];
      const smsMsg = smsResults.length > 0 ? ` (${smsResults.join(', ')})` : '';
      toast.success(`Delivery updated${smsMsg}`);
      setAssignModal(null);
      fetchData();
    } catch { toast.error('Failed to update delivery'); }
    finally { setUpdating(null); }
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDriver(true);
    try {
      const url = '/api/drivers';
      const method = editDriver ? 'PATCH' : 'POST';
      const body = editDriver ? { driverId: editDriver.id, ...driverForm } : driverForm;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success(editDriver ? 'Driver updated' : `Driver ${driverForm.name} added`);
      setDriverForm(DRIVER_EMPTY); setShowDriverForm(false); setEditDriver(null);
      fetchData();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setIsSavingDriver(false); }
  };

  const toggleDriver = async (driver: Driver) => {
    await fetch('/api/drivers', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: driver.id, active: !driver.active }),
    });
    toast.success(`${driver.name} ${driver.active ? 'set to off duty' : 'set to available'}`);
    fetchData();
  };

  const deleteDriver = async (driver: Driver) => {
    if (!confirm(`Remove driver ${driver.name}?`)) return;
    await fetch('/api/drivers', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: driver.id }),
    });
    toast.success('Driver removed');
    fetchData();
  };

  const filtered = statusFilter
    ? deliveries.filter((d) => d.status === statusFilter)
    : deliveries;

  const activeDrivers = drivers.filter((d) => d.active);

  if (authStatus === 'loading') return <div className="p-8">Loading...</div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Logistics & Delivery</h1>
            <p className="text-gray-500 text-sm mt-1">Delivery queue, driver management, SMS notifications</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => { setEditDriver(null); setDriverForm(DRIVER_EMPTY); setShowDriverForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Plus size={15} /> Add Driver
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Summary Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertTriangle size={16} className="text-amber-700" />
                  </div>
                  <p className="text-xs text-gray-500">To Assign</p>
                </div>
                <p className={`text-2xl font-bold ${stats.toAssign > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{stats.toAssign}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Unassigned deliveries</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Truck size={16} className="text-purple-700" />
                  </div>
                  <p className="text-xs text-gray-500">Out for Delivery</p>
                </div>
                <p className="text-2xl font-bold text-purple-700">{stats.outForDelivery}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Currently in transit</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle size={16} className="text-green-700" />
                  </div>
                  <p className="text-xs text-gray-500">Completed Today</p>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.completedToday}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <User size={16} className="text-blue-700" />
                  </div>
                  <p className="text-xs text-gray-500">Available Drivers</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.availableDrivers}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">of {drivers.length} total</p>
              </div>
            </div>
          )}

          {/* Delivery Queue */}
          <div className="bg-white rounded-xl border">
            <div className="p-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-green-700" />
                <h2 className="font-bold text-lg">Delivery Queue</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setStatusFilter('')}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${!statusFilter ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  All
                </button>
                {DELIVERY_STATUSES.filter((s) => s.value !== 'FAILED').map((s) => (
                  <button key={s.value} onClick={() => setStatusFilter(s.value)}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${statusFilter === s.value ? 'bg-green-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Truck size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No deliveries {statusFilter ? 'with this status' : 'in queue'}</p>
                <p className="text-sm mt-1">Deliveries appear when orders move to Out for Delivery</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Order</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Items</th>
                      <th className="px-4 py-3 text-left">Delivery Area</th>
                      <th className="px-4 py-3 text-left">Requested Date</th>
                      <th className="px-4 py-3 text-left">Driver</th>
                      <th className="px-4 py-3 text-right">Fee</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((d) => {
                      const st = getStatusStyle(d.status);
                      const isUnassigned = !d.driverId;
                      return (
                        <tr key={d.id} className={`hover:bg-gray-50 ${isUnassigned && d.status !== 'DELIVERED' ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-sm text-gray-900">{d.order.orderNumber}</p>
                            <p className="text-[11px] text-gray-400">{formatCurrency(Number(d.order.total))}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-sm text-gray-900">{d.order.customer.name}</p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-0.5"><Phone size={10} />{d.order.customer.phone}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5 max-w-[180px]">
                              {d.order.items.slice(0, 2).map((item: OrderItem) => (
                                <p key={item.id} className="text-xs text-gray-600 truncate">{item.product.name} × {item.quantity}</p>
                              ))}
                              {d.order.items.length > 2 && <p className="text-[10px] text-gray-400">+{d.order.items.length - 2} more</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-700 flex items-center gap-1"><MapPin size={12} className="text-gray-400" />{d.order.deliveryArea || d.order.deliveryAddress || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {d.order.deliveryDate ? formatDate(new Date(d.order.deliveryDate)) : d.scheduledDate ? formatDate(new Date(d.scheduledDate)) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {d.driver ? (
                              <div>
                                <p className="text-sm font-medium text-gray-900">{d.driver.name}</p>
                                <p className="text-[10px] text-gray-400">{d.driver.vehicle}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 font-medium">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {Number(d.order.deliveryFee) > 0 ? formatCurrency(Number(d.order.deliveryFee)) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {/* Assign driver button */}
                              {isUnassigned && d.status !== 'DELIVERED' && (
                                <button onClick={() => { setAssignModal(d); setSelectedDriver(''); setSelectedStatus(d.status); }}
                                  className="text-[11px] px-2 py-1 bg-amber-100 text-amber-800 rounded font-medium hover:bg-amber-200">
                                  Assign
                                </button>
                              )}
                              {/* Mark picked up */}
                              {d.driverId && !['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'].includes(d.status) && (
                                <button onClick={() => updateDelivery(d.id, { status: 'OUT_FOR_DELIVERY' })}
                                  disabled={updating === d.id}
                                  className="text-[11px] px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium hover:bg-purple-200 disabled:opacity-50">
                                  Picked up
                                </button>
                              )}
                              {/* Mark delivered */}
                              {d.status === 'OUT_FOR_DELIVERY' && (
                                <button onClick={() => updateDelivery(d.id, { status: 'DELIVERED' })}
                                  disabled={updating === d.id}
                                  className="text-[11px] px-2 py-1 bg-green-100 text-green-800 rounded font-medium hover:bg-green-200 disabled:opacity-50">
                                  Delivered
                                </button>
                              )}
                              {/* Update button for all */}
                              {d.status !== 'DELIVERED' && (
                                <button onClick={() => { setAssignModal(d); setSelectedDriver(d.driverId || ''); setSelectedStatus(d.status); }}
                                  className="text-[11px] px-2 py-1 border border-gray-200 text-gray-600 rounded font-medium hover:bg-gray-50 flex items-center gap-0.5">
                                  <ChevronDown size={10} />
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

          {/* SMS Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <MessageSquare size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 text-sm">Africa&apos;s Talking SMS Notifications</p>
              <p className="text-xs text-blue-800 mt-0.5">When you assign a driver, update pickup, or mark delivered — SMS notifications are sent automatically to driver and customer (~KSh 0.80/SMS). Works on any phone, no app needed.</p>
              <div className="flex gap-4 mt-2 text-[11px] text-blue-700">
                <span>Driver assigned → Driver gets order details</span>
                <span>Picked up → Customer: &quot;on the way&quot;</span>
                <span>Delivered → Customer: &quot;delivered, rate us&quot;</span>
              </div>
            </div>
          </div>

          {/* Driver Management Panel */}
          <div className="bg-white rounded-xl border">
            <button onClick={() => setShowDriverPanel(!showDriverPanel)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <User size={20} className="text-green-700" />
                <h2 className="font-bold text-lg">Driver Management</h2>
                <span className="text-xs text-gray-400">{drivers.length} drivers</span>
              </div>
              {showDriverPanel ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {showDriverPanel && (
              <div className="border-t">
                {drivers.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <User size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No drivers registered</p>
                    <p className="text-sm mt-1">Add drivers to assign them to deliveries.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max">
                      <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3 text-left">Driver</th>
                          <th className="px-4 py-3 text-left">Phone</th>
                          <th className="px-4 py-3 text-left">Vehicle</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-center">Completed Today</th>
                          <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {drivers.map((d) => {
                          const ds = DRIVER_STATUS_STYLES[d.driverStatus || 'AVAILABLE'] || DRIVER_STATUS_STYLES.AVAILABLE;
                          return (
                            <tr key={d.id} className={`hover:bg-gray-50 ${!d.active ? 'opacity-50' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${d.active ? 'bg-green-700' : 'bg-gray-400'}`}>
                                    {d.name.charAt(0).toUpperCase()}
                                  </div>
                                  <p className="font-semibold text-sm text-gray-900">{d.name}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{d.phone}</td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-gray-700">{d.vehicle}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{d.plate}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ds.color}`}>{ds.label}</span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{d.completedToday || 0}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => toggleDriver(d)} title={d.active ? 'Set off duty' : 'Set available'}
                                    className="p-1 hover:bg-gray-100 rounded">
                                    {d.active ? <ToggleRight size={20} className="text-green-600" /> : <ToggleLeft size={20} className="text-gray-400" />}
                                  </button>
                                  <button onClick={() => {
                                    setEditDriver(d);
                                    setDriverForm({ name: d.name, phone: d.phone, vehicle: d.vehicle, plate: d.plate });
                                    setShowDriverForm(true);
                                  }} className="text-[11px] px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 font-medium">
                                    Edit
                                  </button>
                                  <button onClick={() => deleteDriver(d)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                    <Trash2 size={14} />
                                  </button>
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
            )}
          </div>
        </div>

        {/* UPDATE DELIVERY MODAL */}
        {assignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Update Delivery</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{assignModal.order.orderNumber} · {assignModal.order.customer.name}</p>
                </div>
                <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <p><span className="text-gray-500">Delivery to:</span> {assignModal.order.deliveryArea || assignModal.order.deliveryAddress || '—'}</p>
                  <p><span className="text-gray-500">Items:</span> {assignModal.order.items.map((i: OrderItem) => `${i.product.name} × ${i.quantity}`).join(', ')}</p>
                  <p><span className="text-gray-500">Customer phone:</span> {assignModal.order.customer.phone}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Driver</label>
                  <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">No driver</option>
                    {activeDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.vehicle} {d.plate}
                        {d.driverStatus === 'ON_DELIVERY' ? ' (busy)' : ''}
                      </option>
                    ))}
                  </select>
                  {activeDrivers.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No active drivers — add one in Driver Management.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery Status</label>
                  <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {DELIVERY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                {/* SMS preview */}
                {(selectedDriver && selectedDriver !== assignModal.driverId) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                    <MessageSquare size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-800">SMS will be sent to driver with order details and delivery address.</p>
                  </div>
                )}
                {selectedStatus === 'OUT_FOR_DELIVERY' && assignModal.status !== 'OUT_FOR_DELIVERY' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
                    <MessageSquare size={14} className="text-purple-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-purple-800">Customer will receive SMS: &quot;Your order is on the way&quot; with driver contact.</p>
                  </div>
                )}
                {selectedStatus === 'DELIVERED' && assignModal.status !== 'DELIVERED' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                    <MessageSquare size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-800">Customer will receive SMS: &quot;Order delivered — rate us&quot;</p>
                  </div>
                )}
              </div>
              <div className="p-5 border-t flex gap-3">
                <button
                  onClick={() => {
                    const patch: any = {};
                    if (selectedDriver) patch.driverId = selectedDriver;
                    if (selectedStatus && selectedStatus !== assignModal.status) patch.status = selectedStatus;
                    if (Object.keys(patch).length) updateDelivery(assignModal.id, patch);
                    else { toast.error('No changes to save'); }
                  }}
                  disabled={updating === assignModal.id}
                  className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm">
                  {updating === assignModal.id ? 'Saving...' : 'Save & Send SMS'}
                </button>
                <button onClick={() => setAssignModal(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD / EDIT DRIVER MODAL */}
        {showDriverForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <h2 className="font-bold text-lg">{editDriver ? `Edit: ${editDriver.name}` : 'Add Driver'}</h2>
                <button onClick={() => { setShowDriverForm(false); setEditDriver(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleDriverSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input type="text" required value={driverForm.name}
                      onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="James Mwangi" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
                    <input type="tel" required value={driverForm.phone}
                      onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="+254 7XX XXX XXX" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle *</label>
                    <select value={driverForm.vehicle} onChange={(e) => setDriverForm({ ...driverForm, vehicle: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option>Motorbike</option>
                      <option>Pickup Truck</option>
                      <option>Van</option>
                      <option>Lorry</option>
                      <option>Bicycle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Plate Number *</label>
                    <input type="text" required value={driverForm.plate}
                      onChange={(e) => setDriverForm({ ...driverForm, plate: e.target.value.toUpperCase() })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" placeholder="KAA 123A" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSavingDriver}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm">
                    {isSavingDriver ? 'Saving...' : editDriver ? 'Save Changes' : 'Add Driver'}
                  </button>
                  <button type="button" onClick={() => { setShowDriverForm(false); setEditDriver(null); }}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
