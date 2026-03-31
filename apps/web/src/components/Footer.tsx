import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-green-900 text-white mt-16">
      <div className="container-base py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center text-lg">🐔</div>
              <div>
                <div className="font-bold">EcoKuku</div>
                <div className="text-xs opacity-75">Farm Fresh</div>
              </div>
            </div>
            <p className="text-sm opacity-75">Farm to table fresh chicken and eggs from our Nairobi farm. No antibiotics, no shortcuts.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/shop" className="opacity-75 hover:opacity-100 transition-opacity">All Products</Link></li>
              <li><Link href="/shop?category=eggs" className="opacity-75 hover:opacity-100 transition-opacity">Eggs</Link></li>
              <li><Link href="/shop?category=chicken" className="opacity-75 hover:opacity-100 transition-opacity">Chicken</Link></li>
              <li><Link href="/shop?wholesale=true" className="opacity-75 hover:opacity-100 transition-opacity">Wholesale</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-bold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="opacity-75 hover:opacity-100 transition-opacity">About Us</Link></li>
              <li><Link href="/journey" className="opacity-75 hover:opacity-100 transition-opacity">Farm Journey</Link></li>
              <li><Link href="/referral" className="opacity-75 hover:opacity-100 transition-opacity">Referral Program</Link></li>
              <li><Link href="/contact" className="opacity-75 hover:opacity-100 transition-opacity">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <a href="tel:+254712345678" className="opacity-75 hover:opacity-100 transition-opacity">+254 712 345 678</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:hello@ecokuku.local" className="opacity-75 hover:opacity-100 transition-opacity">hello@ecokuku.local</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="opacity-75">Nairobi, Kenya</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-green-800 pt-8 flex flex-col md:flex-row items-center justify-between text-sm">
          <p className="opacity-75">&copy; {currentYear} EcoKuku. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="opacity-75 hover:opacity-100 transition-opacity">Privacy Policy</Link>
            <Link href="/terms" className="opacity-75 hover:opacity-100 transition-opacity">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
