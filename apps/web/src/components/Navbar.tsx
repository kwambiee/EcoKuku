'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Menu, X, ShoppingCart, User } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { data: session } = useSession();
  const { items } = useCart();

  useEffect(() => {
    setHydrated(true);
  }, []);

  const cartCount = hydrated ? items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <nav className="sticky top-0 z-40 bg-green-900 text-white border-b border-green-800">
      <div className="container-base">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-amber-800">🐔</span>
            </div>
            <div>
              <div className="font-bold text-base">EcoKuku</div>
              <div className="text-xs opacity-75 -mt-1">Farm fresh</div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex gap-8">
            <Link href="/" className="hover:text-amber-200 transition-colors">Home</Link>
            <Link href="/shop" className="hover:text-amber-200 transition-colors">Shop</Link>
            <Link href="/batches" className="hover:text-amber-200 transition-colors">Book a Batch</Link>
            <Link href="/journey" className="hover:text-amber-200 transition-colors">Our Farm</Link>
            <Link href="/about" className="hover:text-amber-200 transition-colors">About</Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/my-flock"
                  className="hidden md:flex items-center gap-1 text-sm text-amber-200 hover:text-white transition-colors"
                >
                  🐣 My Flock
                </Link>
                <Link
                  href="/account"
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-green-800 transition-colors text-sm"
                >
                  <User className="w-4 h-4" />
                  <span>{session.user?.name?.split(' ')[0]}</span>
                </Link>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-md hover:bg-green-800 transition-colors text-sm"
              >
                Sign In
              </Link>
            )}

            <Link
              href="/cart"
              className="relative flex items-center gap-2 px-4 py-2 bg-amber-200 text-amber-800 rounded-md font-medium hover:bg-amber-100 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-green-800 rounded-md transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-green-800 py-4 space-y-2">
            <Link href="/" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link href="/shop" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors" onClick={() => setMobileMenuOpen(false)}>Shop</Link>
            <Link href="/batches" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors" onClick={() => setMobileMenuOpen(false)}>Book a Batch</Link>
            <Link href="/journey" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors" onClick={() => setMobileMenuOpen(false)}>Our Farm</Link>
            <Link href="/about" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors" onClick={() => setMobileMenuOpen(false)}>About</Link>
            {session ? (
              <>
                <Link href="/my-flock" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors" onClick={() => setMobileMenuOpen(false)}>🐣 My Flock</Link>
                <Link href="/account" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors" onClick={() => setMobileMenuOpen(false)}>My Account</Link>
              </>
            ) : (
              <Link href="/auth/login" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
