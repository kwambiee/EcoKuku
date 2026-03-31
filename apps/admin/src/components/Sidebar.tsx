'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Egg,
  Bird,
  Leaf,
  Stethoscope,
  Package,
  ShoppingCart,
  Truck,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Incubation', href: '/incubation', icon: Egg },
  { label: 'Batches', href: '/batches', icon: Bird },
  { label: 'Egg Production', href: '/eggs', icon: Egg },
  { label: 'Feed', href: '/feed', icon: Leaf },
  { label: 'Health', href: '/health', icon: Stethoscope },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Logistics', href: '/logistics', icon: Truck },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-green-900 text-white p-4 flex items-center justify-between z-40">
        <div className="font-bold">EcoKuku Admin</div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-green-800 rounded">
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-green-900 text-white transition-all duration-300 z-30 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-green-800">
          <div className="font-bold text-xl">EcoKuku Admin</div>
          <div className="text-xs opacity-75 mt-1">Farm Management</div>
        </div>

        <nav className="overflow-y-auto h-[calc(100vh-100px)] p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-md mb-2 transition-colors ${
                  isActive
                    ? 'bg-green-800 text-white'
                    : 'text-green-100 hover:bg-green-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
        />
      )}
    </>
  );
}
