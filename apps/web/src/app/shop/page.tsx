import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function ShopPage() {
  const products = [
    { id: 1, name: 'Eggs - Tray (30)', category: 'eggs', price: 650, wholesale: false, image: '🥚' },
    { id: 2, name: 'Eggs - Crate (360)', category: 'eggs', price: 6800, wholesale: true, image: '🥚' },
    { id: 3, name: 'Live Broiler Chicken (2kg)', category: 'chicken', price: 850, wholesale: false, image: '🐔' },
    { id: 4, name: 'Dressed Chicken (1.8kg)', category: 'chicken', price: 1200, wholesale: false, image: '🍗' },
    { id: 5, name: 'Day-Old Chicks (100)', category: 'chicks', price: 1500, wholesale: true, image: '🐣' },
    { id: 6, name: 'Kienyeji Eggs - Tray', category: 'eggs', price: 750, wholesale: false, image: '🥚' },
    { id: 7, name: 'Live Layer Chicken', category: 'chicken', price: 900, wholesale: false, image: '🐔' },
    { id: 8, name: 'Broiler Chicks - 500/Box', category: 'chicks', price: 5000, wholesale: true, image: '🐣' },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-200">
          <div className="container-base py-6">
            <h1 className="text-3xl font-bold mb-2">Shop</h1>
            <p className="text-gray-600">Browse our fresh poultry products</p>
          </div>
        </div>

        <div className="container-base py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar Filters */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-lg mb-4">Filters</h3>

                <div className="mb-6">
                  <h4 className="font-bold text-sm mb-3">Category</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                      <span className="ml-2 text-sm">Eggs</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="ml-2 text-sm">Live Poultry</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="ml-2 text-sm">Dressed Meat</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="ml-2 text-sm">Chicks</span>
                    </label>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-bold text-sm mb-3">Order Type</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="ml-2 text-sm">Retail</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="ml-2 text-sm">Wholesale</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="ml-2 text-sm">Pre-order</span>
                    </label>
                  </div>
                </div>

                <button className="w-full btn-secondary text-sm">Reset filters</button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="md:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Link key={product.id} href={`/shop/${product.id}`} className="group">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-green-400 transition-colors">
                      <div className="bg-green-100 h-40 flex items-center justify-center text-6xl relative">
                        {product.image}
                        {product.wholesale && (
                          <span className="absolute top-2 left-2 bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">
                            Wholesale
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-sm mb-2 group-hover:text-green-700 transition-colors">{product.name}</h3>
                        <p className="text-green-700 font-bold text-lg mb-3">KSh {product.price.toLocaleString()}</p>
                        <button className="w-full bg-green-800 text-white font-medium py-2 rounded-md hover:bg-green-700 transition-colors text-sm">
                          Add to cart
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {products.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">No products found. Try adjusting your filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
