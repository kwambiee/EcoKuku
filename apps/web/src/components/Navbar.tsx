'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingCart } from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = 3; // TODO: Get from cart store

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
            <Link href="/journey" className="hover:text-amber-200 transition-colors">Our Farm</Link>
            <Link href="/about" className="hover:text-amber-200 transition-colors">About</Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <Link href="/checkout" className="flex items-center gap-2 px-4 py-2 bg-amber-200 text-amber-800 rounded-md font-medium hover:bg-amber-100 transition-colors">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="text-xs font-bold">{cartCount}</span>}
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
            <Link href="/" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors">Home</Link>
            <Link href="/shop" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors">Shop</Link>
            <Link href="/journey" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors">Our Farm</Link>
            <Link href="/about" className="block px-4 py-2 hover:bg-green-800 rounded-md transition-colors">About</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
