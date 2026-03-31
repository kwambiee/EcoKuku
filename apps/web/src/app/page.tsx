import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckCircle2, Leaf, AlertCircle, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-green-900 text-white py-12 md:py-20">
          <div className="container-base">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-block mb-6 px-4 py-2 bg-amber-200 bg-opacity-20 border border-amber-200 rounded-full">
                <span className="text-amber-100 text-sm font-medium">100% organic · Nairobi farm fresh</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Farm to table <span className="text-amber-200">fresh chicken</span> & eggs
              </h1>
              <p className="text-lg text-green-100 mb-8">
                Raised free-range on our Nairobi farm. No antibiotics, no shortcuts — just clean, honest poultry delivered to your door.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/shop" className="btn-primary">Shop now</Link>
                <Link href="/journey" className="btn-secondary">See our farm</Link>
              </div>

              {/* Hero Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-green-800">
                <div>
                  <div className="text-3xl font-bold text-amber-200">4,200+</div>
                  <div className="text-sm text-green-200">Happy customers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-200">12k</div>
                  <div className="text-sm text-green-200">Eggs weekly</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-200">0</div>
                  <div className="text-sm text-green-200">Antibiotics used</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-200">2h</div>
                  <div className="text-sm text-green-200">Avg delivery time</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-12 md:py-16">
          <div className="container-base">
            <h2 className="text-3xl font-bold mb-2">Why choose EcoKuku?</h2>
            <p className="text-gray-600 mb-10">We're not just a supplier — we're a farm you can trust.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card p-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Leaf className="w-5 h-5 text-green-700" />
                </div>
                <h3 className="font-bold text-lg mb-2">100% Organic</h3>
                <p className="text-gray-600 text-sm">No antibiotics, hormones, or artificial feed. Pure, natural poultry.</p>
              </div>

              <div className="card p-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-700" />
                </div>
                <h3 className="font-bold text-lg mb-2">Guaranteed Fresh</h3>
                <p className="text-gray-600 text-sm">Farm collected same-day. Delivered in 2 hours in Nairobi.</p>
              </div>

              <div className="card p-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <AlertCircle className="w-5 h-5 text-green-700" />
                </div>
                <h3 className="font-bold text-lg mb-2">Hygiene Standards</h3>
                <p className="text-gray-600 text-sm">Controlled environment, daily health checks, clean facilities.</p>
              </div>

              <div className="card p-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-green-700" />
                </div>
                <h3 className="font-bold text-lg mb-2">Farm Transparency</h3>
                <p className="text-gray-600 text-sm">See every step of the journey from egg to your table.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-12 md:py-16 bg-green-50">
          <div className="container-base">
            <h2 className="text-3xl font-bold mb-2">Featured products</h2>
            <p className="text-gray-600 mb-10">Fresh today from our farm.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Sample Product Cards */}
              {[
                { name: 'Eggs - Tray (30)', price: 650, image: '🥚' },
                { name: 'Live Broiler Chicken', price: 850, image: '🐔' },
                { name: 'Dressed Chicken', price: 1200, image: '🍗' },
                { name: 'Day-Old Chicks (100)', price: 1500, image: '🐣' },
              ].map((product) => (
                <Link key={product.name} href="/shop" className="card overflow-hidden hover:border-green-300 transition-colors">
                  <div className="bg-green-100 h-40 flex items-center justify-center text-6xl">
                    {product.image}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm mb-2">{product.name}</h3>
                    <p className="text-green-700 font-bold text-lg">KSh {product.price.toLocaleString()}</p>
                    <button className="w-full mt-3 bg-green-800 text-white font-medium py-2 rounded-md hover:bg-green-700 transition-colors">
                      Add to cart
                    </button>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/shop" className="btn-primary">View all products</Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-green-900 text-white py-12 text-center">
          <div className="container-base">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Get 15% off your first order</h2>
            <p className="text-green-100 mb-6">Use referral code <span className="font-bold">FRESH15</span> at checkout. Valid for retail orders only.</p>
            <Link href="/checkout" className="btn-primary">Claim discount</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
