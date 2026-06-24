'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Badge } from '@ecokuku/ui';
import { toast } from 'sonner';
import { Truck, MapPin, User, RefreshCw, ChevronDown, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

interface Driver {
  id: string; name: string; phone: string;
  vehicle: string; plate: string; active: boolean;
}

interface Delivery {
  id: string; status: string; scheduledDate: string;
  order: {
    orderNumber: string; total: number;
    deliveryAddress?: string; deliveryArea?: string;
    customer: { name: string; phone: string };
  };
  driver?: Driver;
}

interface Metrics { todayTotal: number; inTransit: number; completed: number; }

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-yellow-100 text-yellow-800', PROCESSING: 'bg-blue-100 text-blue-800',
  PACKED: 'bg-indigo-100 text-indigo-800', OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800', FAILED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-gray-100 text-gray-700',
};
const STATUS_STEPS = ['SCHEDULED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const DRIVER_EMPTY = { name: '', phone: '', vehicle: 'Motorbike', plate: '' };

export default function LogisticsPage() {
  const [tab, setTab] = useState<'deliveries' | 'drivers'>('deliveries');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ todayTotal: 0, inTransit: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<Delivery | null>(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState(DRIVER_EMPTY);
  const [isSavingDriver, setIsSavingDriver] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [logRes, drvRes] = await Promise.all([
        fetch('/api/logistics'),
        fetch('/api/drivers'),
      ]);
      const logData = await logRes.json();
      const drvData = await drvRes.json();
      setDeliveries(logData.deliveries || []);
      setMetrics(logData.metrics || { todayTotal: 0, inTransit: 0, completed: 0 });
      setDrivers(drvData.data || []);
    } catch { toast.error('Failed to load logistics data'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const updateDelivery = async (deliveryId: string, patch: { driverId?: string; status?: string }) => {
    setUpdating(deliveryId);
    try {
      const res = await fetch('/api/logistics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId, ...patch }),
      });
      if (res.ok) {
        toast.success('Delivery updated');
        setAssignModal(null);
        fetchData();
      } else {
        toast.error('Failed to update delivery');
      }
    } finally { setUpdating(null); }
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDriver(true);
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add driver');
      }
      toast.success(`Driver ${driverForm.name} added`);
      setDriverForm(DRIVER_EMPTY);
      setShowDriverForm(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add driver');
    } finally { setIsSavingDriver(false); }
  };

  const toggleDriver = async (driver: Driver) => {
    await fetch('/api/drivers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: driver.id, active: !driver.active }),
    });
    toast.success(`${driver.name} ${driver.active ? 'deactivated' : 'activated'}`);
    fetchData();
  };

  const deleteDriver = async (driver: Driver) => {
    if (!confirm(`Remove driver ${driver.name}?`)) return;
    await fetch('/api/drivers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: driver.id }),
    });
    toast.success('Driver removed');
    fetchData();
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-6 mt-16 lg:mt-0 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Logistics & Delivery</h1>
            <p className="text-gray-600 mt-1">Track deliveries and manage drivers</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Today's Deliveries", value: metrics.todayTotal, color: 'text-gray-900' },
              { label: 'In Transit', value: metrics.inTransit, color: 'text-purple-700' },
              { label: 'Completed Today', value: metrics.completed, color: 'text-green-700' },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-lg border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-500">{m.label}</p>
                <p className={`text-3xl font-bold mt-1 ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {(['deliveries', 'drivers'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                {t}{t === 'drivers' ? ` (${drivers.length})` : ''}
              </button>
            ))}
          </div>

          {tab === 'deliveries' && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-5 border-b border-gray-200 flex items-center gap-2">
                <Truck size={18} className="text-green-700" />
                <h2 className="font-bold">Active Deliveries</h2>
              </div>
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : deliveries.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Truck size={40} className="mx-auto mb-3 text-gray-300" />
                  <p>No active deliveries.</p>
                  <p className="text-sm mt-1">Deliveries appear here automatically when orders are paid.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Order</th>
                        <th className="px-4 py-3 text-left">Customer</th>
                        <th className="px-4 py-3 text-left">Area</th>
                        <th className="px-4 py-3 text-left">Driver</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {deliveries.map((d) => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm font-medium">{d.order.orderNumber}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">{d.order.customer.name}</p>
                            <p className="text-xs text-gray-500">{d.order.customer.phone}</p>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} className="text-gray-400" />
                              {d.order.deliveryArea || d.order.deliveryAddress || '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {d.driver ? <span className="font-medium">{d.driver.name}</span> : <span className="text-amber-600 text-xs">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-700'}>
                              {d.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setAssignModal(d); setSelectedDriver(d.driver?.id || ''); setSelectedStatus(d.status); }}
                              className="flex items-center gap-1 text-xs text-green-700 font-medium border border-green-200 px-2 py-1 rounded hover:bg-green-50">
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
          )}

          {tab === 'drivers' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowDriverForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  <Plus size={16} /> Add Driver
                </button>
              </div>
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-5 border-b border-gray-200 flex items-center gap-2">
                  <User size={18} className="text-green-700" />
                  <h2 className="font-bold">Registered Drivers</h2>
                </div>
                {drivers.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <User size={40} className="mx-auto mb-3 text-gray-300" />
                    <p>No drivers registered yet.</p>
                    <p className="text-sm mt-1">Add drivers to assign them to deliveries.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {drivers.map((d) => (
                      <div key={d.id} className={`p-5 flex items-center justify-between ${!d.active ? 'opacity-50 bg-gray-50' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${d.active ? 'bg-green-700' : 'bg-gray-400'}`}>
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{d.name}</p>
                            <p className="text-sm text-gray-500">{d.phone}</p>
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-700">{d.vehicle}</p>
                            <p className="text-xs text-gray-500 font-mono">{d.plate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {d.active ? 'Active' : 'Inactive'}
                          </span>
                          <button onClick={() => toggleDriver(d)} title={d.active ? 'Deactivate' : 'Activate'}>
                            {d.active ? <ToggleRight size={22} className="text-green-600" /> : <ToggleLeft size={22} className="text-gray-400" />}
                          </button>
                          <button onClick={() => deleteDriver(d)} className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* UPDATE DELIVERY MODAL */}
        {assignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b border-gray-200 flex justify-between">
                <h3 className="font-bold text-lg">Update Delivery</h3>
                <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">Order: <strong>{assignModal.order.orderNumber}</strong> · {assignModal.order.customer.name}</p>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Driver</label>
                  <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">No driver</option>
                    {drivers.filter((d) => d.active).map((d) => (
                      <option key={d.id} value={d.id}>{d.name} — {d.vehicle} {d.plate}</option>
                    ))}
                  </select>
                  {drivers.filter((d) => d.active).length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No active drivers — go to Drivers tab to add one.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {STATUS_STEPS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const patch: any = {};
                      if (selectedDriver) patch.driverId = selectedDriver;
                      if (selectedStatus) patch.status = selectedStatus;
                      if (Object.keys(patch).length) updateDelivery(assignModal.id, patch);
                    }}
                    disabled={updating === assignModal.id}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {updating === assignModal.id ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setAssignModal(null)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD DRIVER MODAL */}
        {showDriverForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b border-gray-200 flex justify-between">
                <h2 className="font-bold text-xl">Add Driver</h2>
                <button onClick={() => setShowDriverForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="07XXXXXXXX" />
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Plate *</label>
                    <input type="text" required value={driverForm.plate}
                      onChange={(e) => setDriverForm({ ...driverForm, plate: e.target.value.toUpperCase() })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" placeholder="KAA 123A" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isSavingDriver}
                    className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">
                    {isSavingDriver ? 'Adding...' : 'Add Driver'}
                  </button>
                  <button type="button" onClick={() => setShowDriverForm(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
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
