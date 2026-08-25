'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import {
  Save, ChevronDown, ChevronUp, Building2, Bell, Truck, DollarSign,
  Users, Plug, Plus, Trash2, Edit2, X, Shield, Eye, EyeOff, CheckCircle,
  Clock, RefreshCw, AlertTriangle,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface StaffUser {
  id: string; name: string; email: string; phone?: string;
  role: 'ADMIN' | 'STAFF' | 'DRIVER'; isActive: boolean; createdAt: string;
}

interface ActivityEntry {
  id: string; userName: string; userEmail: string; action: string;
  module: string; createdAt: string;
}

interface DeliveryZone { name: string; fee: number; }

// ─── Constants ─────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  ADMIN: {
    label: 'Admin', color: 'bg-purple-100 text-purple-800 border border-purple-300',
    desc: 'Full access — money, pricing, staff, all farm data, settings',
  },
  STAFF: {
    label: 'Farm Staff', color: 'bg-green-100 text-green-800 border border-green-300',
    desc: 'Farm operations only — batches, eggs, feed, health. No financials or user management.',
  },
  DRIVER: {
    label: 'Delivery / Rider', color: 'bg-orange-100 text-orange-800 border border-orange-300',
    desc: 'Own assigned deliveries only. No access to any other module.',
  },
};

const ROLE_MATRIX = [
  {
    module: 'Batches & Incubation', admin: ['Full CRUD', 'Set acquisition cost', 'Close/archive batches'], staff: ['View all batches', 'Log mortality & growth', 'Cannot see acquisition cost'], driver: ['No access'],
  },
  {
    module: 'Eggs, Feed & Health', admin: ['Full CRUD on all logs', 'View feed purchase costs', 'Edit vaccination schedules'], staff: ['Log daily entries (eggs, feed, vaccinations)', 'Cannot see feed purchase price/supplier cost', 'Can edit own entries only, same-day'], driver: ['No access'],
  },
  {
    module: 'Products & Inventory', admin: ['Set retail & wholesale prices', 'Add/remove product types', 'Toggle product visibility'], staff: ['View stock levels (read-only)', 'Cannot change prices', 'Cannot add/remove products'], driver: ['No access'],
  },
  {
    module: 'Orders & Batch Bookings', admin: ['Full order management', 'Cancel / refund orders', 'Change order prices'], staff: ['View + update status (if helping pack/dispatch)', 'Cannot cancel or refund', 'Cannot edit order prices'], driver: ['View/update own orders complete', 'Sees only assigned orders'],
  },
  {
    module: 'Logistics', admin: ['Assign any order to any driver', 'Add/remove drivers', 'Set delivery zone pricing'], staff: ['No access (unless dual-role)'], driver: ['View own delivery queue only', 'Mark picked up / delivered', 'Cannot see other drivers\' routes'],
  },
  {
    module: 'Customers', admin: ['View all customer financials', 'Add promos & manage discounts', 'Customer marketing/export'], staff: ['No access by default'], driver: ['Name, phone & address on their assigned deliveries'],
  },
  {
    module: 'Reports, Expenses & Settings', admin: ['Full access to all financials', 'Manage staff accounts', 'Configure all settings', 'View activity log'], staff: ['No access — entirely hidden from sidebar'], driver: ['No access — entirely hidden from sidebar'],
  },
];

const EMPTY_STAFF_FORM = { name: '', email: '', phone: '', password: '', role: 'STAFF' as 'ADMIN' | 'STAFF' | 'DRIVER' };

// ─── Section wrapper ───────────────────────────────────────────────────────

function Section({ icon, title, subtitle, children, defaultOpen = false }: {
  icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border">
      <button onClick={() => setOpen(!open)} className="w-full p-5 flex items-center justify-between hover:bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-green-700">{icon}</div>
          <div className="text-left">
            <p className="font-bold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && <div className="border-t p-6 space-y-5">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string;
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none ${className}`} />
  );
}

function SaveRow({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="pt-2 flex justify-end border-t">
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-2 px-5 py-2 bg-green-800 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
        <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'ADMIN';

  // All settings as flat key-value
  const [s, setS] = useState<Record<string, string>>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Delivery zones
  const [zones, setZones] = useState<DeliveryZone[]>([{ name: 'Nairobi CBD', fee: 200 }]);
  const [newZone, setNewZone] = useState({ name: '', fee: '' });

  // Staff management
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  // Activity log
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);

  // Integration key visibility
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => { if (authStatus === 'unauthenticated') router.push('/login'); }, [authStatus, router]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setS(data.settings);
        if (data.settings.delivery_zones) {
          try { setZones(JSON.parse(data.settings.delivery_zones)); } catch { /* */ }
        }
      }
    } catch { /* */ }
  }, []);

  const fetchStaff = useCallback(async () => {
    if (!isAdmin) return;
    setStaffLoading(true);
    try {
      const res = await fetch('/api/settings/users');
      const data = await res.json();
      setStaff(data.data || []);
    } catch { /* */ }
    finally { setStaffLoading(false); }
  }, [isAdmin]);

  const fetchActivity = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/settings/activity?limit=30');
      const data = await res.json();
      setActivityLog(data.data || []);
    } catch { /* */ }
  }, [isAdmin]);

  useEffect(() => {
    if (session?.user) { fetchSettings(); fetchStaff(); fetchActivity(); }
  }, [session, fetchSettings, fetchStaff, fetchActivity]);

  const set = (key: string, value: string) => setS((prev) => ({ ...prev, [key]: value }));

  const saveSection = async (keys: string[], section: string) => {
    setSavingSection(section);
    try {
      const payload: Record<string, string> = {};
      keys.forEach((k) => { if (s[k] !== undefined) payload[k] = s[k]; });
      // Delivery zones special case
      if (section === 'delivery') payload.delivery_zones = JSON.stringify(zones);
      const res = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
    finally { setSavingSection(null); }
  };

  // Staff management
  const openAddStaff = () => { setEditingStaff(null); setStaffForm(EMPTY_STAFF_FORM); setShowPassword(false); setShowStaffModal(true); };
  const openEditStaff = (u: StaffUser) => {
    setEditingStaff(u);
    setStaffForm({ name: u.name, email: u.email, phone: u.phone || '', password: '', role: u.role });
    setShowPassword(false); setShowStaffModal(true);
  };

  const submitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStaff(true);
    try {
      const res = editingStaff
        ? await fetch('/api/settings/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: editingStaff.id, ...staffForm }) })
        : await fetch('/api/settings/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(staffForm) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      toast.success(editingStaff ? 'Account updated' : 'Account created');
      setShowStaffModal(false); fetchStaff(); fetchActivity();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed'); }
    finally { setSavingStaff(false); }
  };

  const toggleActive = async (u: StaffUser) => {
    const res = await fetch('/api/settings/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, isActive: !u.isActive }) });
    if (res.ok) { toast.success(u.isActive ? 'Account deactivated' : 'Account reactivated'); fetchStaff(); fetchActivity(); }
    else toast.error('Failed');
  };

  const deleteStaff = async (u: StaffUser) => {
    if (!confirm(`Permanently delete ${u.name}'s account? This cannot be undone.`)) return;
    const res = await fetch('/api/settings/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id }) });
    if (res.ok) { toast.success('Account deleted'); fetchStaff(); fetchActivity(); }
    else toast.error('Failed');
  };

  if (authStatus === 'loading') return <div className="p-8">Loading…</div>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 lg:ml-64 min-h-screen bg-gray-100">
        <div className="bg-white border-b border-gray-200 p-4 sm:p-6 mt-14 lg:mt-0">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure farm profile, delivery, pricing, staff, and integrations</p>
        </div>

        <div className="p-4 sm:p-6 space-y-4">

          {/* ── FARM PROFILE ──────────────────────────────────────── */}
          <Section icon={<Building2 size={18} />} title="Farm Profile" subtitle="Name, contact, legal & payment details" defaultOpen>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field label="Farm Name"><Input value={s.farm_name || ''} onChange={(v) => set('farm_name', v)} placeholder="Kwamboka Poultry Farm" /></Field>
              <Field label="Contact Email"><Input value={s.contact_email || ''} onChange={(v) => set('contact_email', v)} type="email" placeholder="info@kwambokapoultry.co.ke" /></Field>
              <Field label="Contact Phone"><Input value={s.contact_phone || ''} onChange={(v) => set('contact_phone', v)} placeholder="+254712345678" /></Field>
              <Field label="Physical Location"><Input value={s.farm_location || ''} onChange={(v) => set('farm_location', v)} placeholder="Ruiru, Kiambu County" /></Field>
              <Field label="KRA PIN" hint="Used on invoices"><Input value={s.kra_pin || ''} onChange={(v) => set('kra_pin', v)} placeholder="P051234567X" /></Field>
              <Field label="Business Registration No."><Input value={s.biz_reg || ''} onChange={(v) => set('biz_reg', v)} placeholder="CPR/2023/123456" /></Field>
              <Field label="M-Pesa Till / Paybill Number" hint="Displayed on customer payment screens">
                <Input value={s.mpesa_till || ''} onChange={(v) => set('mpesa_till', v)} placeholder="174379" />
              </Field>
              <Field label="Bank Account (optional)">
                <Input value={s.bank_account || ''} onChange={(v) => set('bank_account', v)} placeholder="Co-op Bank — 0123456789" />
              </Field>
            </div>
            <SaveRow onSave={() => saveSection(['farm_name','contact_email','contact_phone','farm_location','kra_pin','biz_reg','mpesa_till','bank_account'], 'profile')} saving={savingSection === 'profile'} />
          </Section>

          {/* ── NOTIFICATIONS ─────────────────────────────────────── */}
          <Section icon={<Bell size={18} />} title="Notification Preferences" subtitle="Alerts, reminders, and automated reports">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field label="Low Feed Alert (days remaining)" hint="Get alerted when any feed type has fewer than this many days of stock">
                <Input value={s.feed_alert_days || '7'} onChange={(v) => set('feed_alert_days', v)} type="number" placeholder="7" />
              </Field>
              <Field label="Vaccination Reminder (days before due)" hint="How many days before a scheduled vaccination to send a reminder">
                <Input value={s.vacc_reminder_days || '3'} onChange={(v) => set('vacc_reminder_days', v)} type="number" placeholder="3" />
              </Field>
              <Field label="New Order Notification">
                <select value={s.order_notif_channel || 'BOTH'}
                  onChange={(e) => set('order_notif_channel', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                  <option value="SMS">SMS only</option>
                  <option value="EMAIL">Email only</option>
                  <option value="BOTH">SMS + Email</option>
                  <option value="NONE">None</option>
                </select>
              </Field>
              <Field label="Daily Summary Report">
                <div className="flex gap-3">
                  <select value={s.daily_summary || 'OFF'}
                    onChange={(e) => set('daily_summary', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                    <option value="OFF">Off</option>
                    <option value="ON">On</option>
                  </select>
                  {s.daily_summary === 'ON' && (
                    <Input value={s.daily_summary_time || '07:00'} onChange={(v) => set('daily_summary_time', v)} type="time" className="w-32" />
                  )}
                </div>
              </Field>
            </div>
            <SaveRow onSave={() => saveSection(['feed_alert_days','vacc_reminder_days','order_notif_channel','daily_summary','daily_summary_time'], 'notifications')} saving={savingSection === 'notifications'} />
          </Section>

          {/* ── DELIVERY SETTINGS ─────────────────────────────────── */}
          <Section icon={<Truck size={18} />} title="Delivery Settings" subtitle="Zones, fees, and working hours">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Delivery Zones & Fees</p>
              <div className="space-y-2 mb-3">
                {zones.map((z, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={z.name} onChange={(e) => {
                      const nz = [...zones]; nz[i] = { ...nz[i], name: e.target.value }; setZones(nz);
                    }} placeholder="Zone name (e.g. Westlands)"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">KSh</span>
                      <input type="number" value={z.fee} onChange={(e) => {
                        const nz = [...zones]; nz[i] = { ...nz[i], fee: parseFloat(e.target.value) || 0 }; setZones(nz);
                      }} placeholder="Fee"
                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                    </div>
                    <button onClick={() => setZones(zones.filter((_, j) => j !== i))}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  placeholder="New zone name" className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                <input type="number" value={newZone.fee} onChange={(e) => setNewZone({ ...newZone, fee: e.target.value })}
                  placeholder="Fee (KSh)" className="w-28 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                <button onClick={() => {
                  if (!newZone.name || !newZone.fee) return;
                  setZones([...zones, { name: newZone.name, fee: parseFloat(newZone.fee) }]);
                  setNewZone({ name: '', fee: '' });
                }} className="flex items-center gap-1 px-3 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
              <Field label="Min Order for Free Delivery (KSh)" hint="Set 0 to never offer free delivery">
                <Input value={s.min_free_delivery || '0'} onChange={(v) => set('min_free_delivery', v)} type="number" placeholder="5000" />
              </Field>
              <Field label="Delivery Hours Start">
                <Input value={s.delivery_hours_start || '08:00'} onChange={(v) => set('delivery_hours_start', v)} type="time" />
              </Field>
              <Field label="Delivery Hours End">
                <Input value={s.delivery_hours_end || '18:00'} onChange={(v) => set('delivery_hours_end', v)} type="time" />
              </Field>
            </div>
            <SaveRow onSave={() => saveSection(['min_free_delivery','delivery_hours_start','delivery_hours_end'], 'delivery')} saving={savingSection === 'delivery'} />
          </Section>

          {/* ── PRICING & BUSINESS RULES ──────────────────────────── */}
          <Section icon={<DollarSign size={18} />} title="Pricing & Business Rules" subtitle="Wholesale thresholds and batch booking deposit">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Field label="Wholesale Min. Order Qty" hint="Minimum units to qualify for wholesale pricing">
                <Input value={s.wholesale_min_qty || '10'} onChange={(v) => set('wholesale_min_qty', v)} type="number" placeholder="10" />
              </Field>
              <Field label="Wholesale Discount (%)" hint="e.g. 15 means 15% off retail price">
                <Input value={s.wholesale_discount_pct || '15'} onChange={(v) => set('wholesale_discount_pct', v)} type="number" placeholder="15" />
              </Field>
              <Field label="Batch Booking Deposit (%)" hint="Required deposit % when a customer books a batch">
                <Input value={s.batch_deposit_pct || '30'} onChange={(v) => set('batch_deposit_pct', v)} type="number" placeholder="30" />
              </Field>
            </div>
            <SaveRow onSave={() => saveSection(['wholesale_min_qty','wholesale_discount_pct','batch_deposit_pct'], 'pricing')} saving={savingSection === 'pricing'} />
          </Section>

          {/* ── USER & STAFF MANAGEMENT ───────────────────────────── */}
          {isAdmin && (
            <Section icon={<Users size={18} />} title="User & Staff Management" subtitle="Add staff, assign roles, view activity log">

              {/* Role Matrix toggle */}
              <div>
                <button onClick={() => setShowMatrix(!showMatrix)}
                  className="flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-700 mb-3">
                  <Shield size={15} />
                  {showMatrix ? 'Hide' : 'View'} role permissions matrix
                  {showMatrix ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showMatrix && (
                  <div className="mb-5 rounded-xl border overflow-x-auto">
                    {/* Role key */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-gray-900 min-w-[600px]">
                      {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                        <div key={role} className="rounded-lg p-3" style={{ background: role === 'ADMIN' ? '#2d1b69' : role === 'STAFF' ? '#0f3024' : '#3d2200' }}>
                          <p className="text-xs font-bold text-white mb-0.5">{cfg.label}</p>
                          <p className="text-[10px] text-gray-300">{cfg.desc}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <table className="w-full text-xs min-w-[600px]">
                        <thead className="bg-gray-800 text-gray-300">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium w-40">Module</th>
                            <th className="px-3 py-2 text-left font-medium text-purple-300">Admin</th>
                            <th className="px-3 py-2 text-left font-medium text-green-300">Farm Staff</th>
                            <th className="px-3 py-2 text-left font-medium text-orange-300">Driver</th>
                          </tr>
                        </thead>
                        <tbody className="bg-gray-900 divide-y divide-gray-800">
                          {ROLE_MATRIX.map((row) => (
                            <tr key={row.module}>
                              <td className="px-3 py-2.5 font-semibold text-gray-200 align-top">{row.module}</td>
                              <td className="px-3 py-2.5 align-top">
                                <ul className="space-y-0.5">
                                  {row.admin.map((item, i) => (
                                    <li key={i} className="text-green-400 flex items-start gap-1">
                                      <span className="mt-0.5 flex-shrink-0">✓</span> {item}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                <ul className="space-y-0.5">
                                  {row.staff.map((item, i) => (
                                    <li key={i} className={`flex items-start gap-1 ${item.startsWith('Cannot') || item.startsWith('No access') ? 'text-gray-500 line-through' : 'text-green-400'}`}>
                                      <span className="mt-0.5 flex-shrink-0">{item.startsWith('Cannot') || item.startsWith('No access') ? '✗' : '✓'}</span> {item}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td className="px-3 py-2.5 align-top">
                                <ul className="space-y-0.5">
                                  {row.driver.map((item, i) => (
                                    <li key={i} className={`flex items-start gap-1 ${item.startsWith('No access') || item.startsWith('Cannot') || item.startsWith('Sees only') ? 'text-gray-500' : 'text-orange-400'}`}>
                                      <span className="mt-0.5 flex-shrink-0">{item.startsWith('No access') ? '✗' : '·'}</span> {item}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Staff table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Staff Accounts ({staff.length})</p>
                  <button onClick={openAddStaff}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-800 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                    <Plus size={13} /> Add Staff
                  </button>
                </div>
                {staffLoading ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
                ) : staff.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm border rounded-lg">No staff accounts yet.</div>
                ) : (
                  <div className="rounded-xl border overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Email / Phone</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Role</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Added</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {staff.map((u) => {
                          const rc = ROLE_CONFIG[u.role];
                          return (
                            <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                              <td className="px-4 py-3 font-semibold text-sm">{u.name}{u.id === session?.user?.id && <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 px-1 rounded">you</span>}</td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                <p>{u.email}</p>
                                {u.phone && <p className="text-gray-400">{u.phone}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${rc.color}`}>{rc.label}</span>
                              </td>
                              <td className="px-4 py-3">
                                {u.isActive
                                  ? <span className="flex items-center gap-1 text-[11px] text-green-700"><CheckCircle size={11} /> Active</span>
                                  : <span className="flex items-center gap-1 text-[11px] text-red-500"><AlertTriangle size={11} /> Inactive</span>}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-400">
                                {new Date(u.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1">
                                  <button onClick={() => openEditStaff(u)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"><Edit2 size={13} /></button>
                                  {u.id !== session?.user?.id && (
                                    <>
                                      <button onClick={() => toggleActive(u)} title={u.isActive ? 'Deactivate' : 'Reactivate'}
                                        className={`p-1.5 rounded ${u.isActive ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}>
                                        {u.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                                      </button>
                                      <button onClick={() => deleteStaff(u)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 size={13} /></button>
                                    </>
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

              {/* Activity log */}
              {activityLog.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Clock size={14} /> Recent Activity Log</p>
                  <div className="rounded-xl border overflow-hidden divide-y divide-gray-100">
                    {activityLog.map((entry) => (
                      <div key={entry.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-gray-50">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle size={12} className="text-green-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{entry.action}</p>
                          <p className="text-[10px] text-gray-400">{entry.userName} · {new Date(entry.createdAt).toLocaleString('en-KE')}</p>
                        </div>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">{entry.module}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={fetchActivity} className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                    <RefreshCw size={11} /> Refresh
                  </button>
                </div>
              )}
            </Section>
          )}

          {/* ── INTEGRATIONS ──────────────────────────────────────── */}
          {isAdmin && (
            <Section icon={<Plug size={18} />} title="Integrations" subtitle="M-Pesa Daraja, Africa's Talking SMS, Cloudinary">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mb-2">
                API keys are stored in the database. For production, move sensitive keys to server environment variables (.env).
              </div>

              {/* M-Pesa */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">M-Pesa Daraja API</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {[
                    ['mpesa_consumer_key', 'Consumer Key'],
                    ['mpesa_consumer_secret', 'Consumer Secret'],
                    ['mpesa_shortcode', 'Shortcode (Paybill/Till)'],
                    ['mpesa_passkey', 'Lipa Na M-Pesa Passkey'],
                  ].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <div className="relative">
                        <input type={showKeys[key] ? 'text' : 'password'} value={s[key] || ''}
                          onChange={(e) => set(key, e.target.value)} placeholder={`Enter ${label}`}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-9 focus:ring-2 focus:ring-green-500 focus:outline-none" />
                        <button type="button" onClick={() => setShowKeys((p) => ({ ...p, [key]: !p[key] }))}
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                          {showKeys[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </Field>
                  ))}
                </div>
              </div>

              {/* Africa's Talking */}
              <div className="pt-2">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Africa's Talking (SMS)</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {[
                    ['at_api_key', 'API Key'],
                    ['at_username', 'Username'],
                  ].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <div className="relative">
                        <input type={showKeys[key] ? 'text' : 'password'} value={s[key] || ''}
                          onChange={(e) => set(key, e.target.value)} placeholder={`Enter ${label}`}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-9 focus:ring-2 focus:ring-green-500 focus:outline-none" />
                        <button type="button" onClick={() => setShowKeys((p) => ({ ...p, [key]: !p[key] }))}
                          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                          {showKeys[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </Field>
                  ))}
                </div>
              </div>

              {/* Cloudinary */}
              <div className="pt-2">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Cloudinary (Image Storage)</p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {[
                    ['cloudinary_cloud_name', 'Cloud Name'],
                    ['cloudinary_api_key', 'API Key'],
                    ['cloudinary_api_secret', 'API Secret'],
                  ].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <div className="relative">
                        <input type={key === 'cloudinary_cloud_name' ? 'text' : (showKeys[key] ? 'text' : 'password')}
                          value={s[key] || ''} onChange={(e) => set(key, e.target.value)} placeholder={`Enter ${label}`}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-9 focus:ring-2 focus:ring-green-500 focus:outline-none" />
                        {key !== 'cloudinary_cloud_name' && (
                          <button type="button" onClick={() => setShowKeys((p) => ({ ...p, [key]: !p[key] }))}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                            {showKeys[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        )}
                      </div>
                    </Field>
                  ))}
                </div>
              </div>

              <SaveRow onSave={() => saveSection(['mpesa_consumer_key','mpesa_consumer_secret','mpesa_shortcode','mpesa_passkey','at_api_key','at_username','cloudinary_cloud_name','cloudinary_api_key','cloudinary_api_secret'], 'integrations')} saving={savingSection === 'integrations'} />
            </Section>
          )}

        </div>
      </main>

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-auto">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">{editingStaff ? 'Edit Account' : 'Add Staff Account'}</h2>
              <button onClick={() => setShowStaffModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={submitStaff} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                  <Input value={staffForm.name} onChange={(v) => setStaffForm({ ...staffForm, name: v })} placeholder="Jane Muthoni" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role *</label>
                  <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
                    <option value="STAFF">Farm Staff</option>
                    <option value="DRIVER">Delivery / Rider</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                <Input value={staffForm.email} onChange={(v) => setStaffForm({ ...staffForm, email: v })} type="email" placeholder="jane@kwambokapoultry.co.ke" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                <Input value={staffForm.phone} onChange={(v) => setStaffForm({ ...staffForm, phone: v })} placeholder="+254700000000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {editingStaff ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    required={!editingStaff}
                    placeholder={editingStaff ? 'Leave blank to keep' : 'Min 8 characters'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-9 focus:ring-2 focus:ring-green-500 focus:outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {/* Role description */}
              <div className={`text-xs p-2.5 rounded-lg ${staffForm.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' : staffForm.role === 'DRIVER' ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                {ROLE_CONFIG[staffForm.role].desc}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={savingStaff}
                  className="flex-1 py-2.5 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 text-sm">
                  {savingStaff ? 'Saving…' : editingStaff ? 'Save Changes' : 'Create Account'}
                </button>
                <button type="button" onClick={() => setShowStaffModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
