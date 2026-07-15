'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, Egg, Bird, Leaf, Stethoscope, Package, ShoppingCart,
  Truck, Users, BarChart3, Settings, Menu, X, ClipboardList, Receipt, LogOut, Target,
} from 'lucide-react';
import { useState } from 'react';

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
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  const navItems = ALL_NAV_ITEMS.filter((item) => !role || item.roles.includes(role));

  const close = () => setIsOpen(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-green-900 text-white px-4 h-14 flex items-center justify-between z-40">
        <div className="font-bold text-base">EcoKuku Admin</div>
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
          <div className="font-bold text-xl">EcoKuku Admin</div>
          <div className="text-xs opacity-60 mt-0.5">Farm Management</div>
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
    </>
  );
}
