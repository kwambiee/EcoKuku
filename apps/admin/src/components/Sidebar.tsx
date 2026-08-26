'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, Egg, Bird, Leaf, Stethoscope, Package, ShoppingCart,
  Truck, Users, BarChart3, Settings, Menu, X, ClipboardList, Receipt, LogOut, Target, TrendingUp, KeyRound,
} from 'lucide-react';
import { useState, useRef } from 'react';

const ALL_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF'] },
  { label: 'Incubation', href: '/incubation', icon: Egg, roles: ['ADMIN', 'STAFF'] },
  { label: 'Batches', href: '/batches', icon: Bird, roles: ['ADMIN', 'STAFF'] },
  { label: 'Egg Production', href: '/eggs', icon: Egg, roles: ['ADMIN', 'STAFF'] },
  { label: 'Feed', href: '/feed', icon: Leaf, roles: ['ADMIN', 'STAFF'] },
  { label: 'Health', href: '/health', icon: Stethoscope, roles: ['ADMIN', 'STAFF'] },
  { label: 'Products & Inventory', href: '/products', icon: Package, roles: ['ADMIN', 'STAFF'] },
  { label: 'Orders', href: '/orders', icon: ShoppingCart, roles: ['ADMIN', 'STAFF'] },
  { label: 'Batch Bookings', href: '/batch-bookings', icon: ClipboardList, roles: ['ADMIN', 'STAFF'] },
  { label: 'Logistics', href: '/logistics', icon: Truck, roles: ['ADMIN', 'STAFF', 'DRIVER'] },
  { label: 'Customers', href: '/customers', icon: Users, roles: ['ADMIN'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN'] },
  { label: 'Goals & Targets', href: '/goals', icon: Target, roles: ['ADMIN'] },
  { label: 'Income', href: '/income', icon: TrendingUp, roles: ['ADMIN'] },
  { label: 'Expenses', href: '/expenses', icon: Receipt, roles: ['ADMIN'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  STAFF: 'Farm Staff',
  DRIVER: 'Delivery Rider',
};

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  const navItems = ALL_NAV_ITEMS.filter((item) => !role || item.roles.includes(role));

  const close = () => setIsOpen(false);

  function openPwModal() {
    setPwForm({ current: '', next: '', confirm: '' });
    setPwStatus(null);
    setShowPwModal(true);
    setTimeout(() => currentRef.current?.focus(), 80);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwStatus({ type: 'error', msg: 'New passwords do not match.' });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwStatus({ type: 'error', msg: 'New password must be at least 8 characters.' });
      return;
    }
    setPwLoading(true);
    setPwStatus(null);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwStatus({ type: 'error', msg: data.error ?? 'Failed to change password.' });
      } else {
        setPwStatus({ type: 'success', msg: 'Password changed! Use the new password next time you log in.' });
        setPwForm({ current: '', next: '', confirm: '' });
      }
    } catch {
      setPwStatus({ type: 'error', msg: 'Network error. Please try again.' });
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-green-900 text-white px-4 h-14 flex items-center justify-between z-40">
        <div className="font-bold text-base">Kwamboka Admin</div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-1.5 hover:bg-green-800 rounded" aria-label="Toggle menu">
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-green-900 text-white z-30 flex flex-col
          transition-transform duration-300 lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-green-800 flex-shrink-0">
          <div className="font-bold text-xl">Kwamboka Admin</div>
          <div className="text-xs opacity-60 mt-0.5">Poultry Farm Management</div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={close}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors text-sm font-medium ${
                  isActive ? 'bg-green-800 text-white' : 'text-green-100 hover:bg-green-800/70 hover:text-white'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer + logout */}
        {session?.user && (
          <div className="p-3 border-t border-green-800 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {session.user.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-green-100 truncate">{session.user.name}</p>
                <p className="text-[10px] text-green-400 truncate">{session.user.email}</p>
              </div>
            </div>
            {role && (
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-green-800 text-green-200 ml-9 mb-2">
                {ROLE_LABEL[role] ?? role}
              </span>
            )}
            <button
              onClick={openPwModal}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-green-200 hover:text-white hover:bg-green-800 rounded-lg transition-colors mb-0.5"
            >
              <KeyRound className="w-3.5 h-3.5 flex-shrink-0" />
              Change password
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-green-200 hover:text-white hover:bg-green-800 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div onClick={close} className="fixed inset-0 bg-black/50 z-20 lg:hidden" aria-hidden />
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-green-700 dark:text-green-400" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</h2>
              </div>
              <button
                onClick={() => setShowPwModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pwStatus && (
              <div className={`mb-4 px-3 py-2.5 rounded-lg text-xs ${
                pwStatus.type === 'success'
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              }`}>
                {pwStatus.msg}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current password
                </label>
                <input
                  ref={currentRef}
                  type="password"
                  required
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="mt-0.5 text-[10px] text-gray-400">At least 8 characters</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  required
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPwModal(false)}
                  className="flex-1 px-3 py-2 text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 px-3 py-2 text-xs font-semibold bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {pwLoading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
