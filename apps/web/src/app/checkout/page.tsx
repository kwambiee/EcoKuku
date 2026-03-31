'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useState } from 'react';

export default function CheckoutPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    area: '',
  });
  const [promoCode, setPromoCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = 1950; // 650 + 850 + 450
  const deliveryFee = 200;
  const discount = 292.50; // 15% of subtotal
  const total = subtotal + deliveryFee - discount;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // TODO: Integrate M-PESA STK Push
    alert('Payment integration coming soon!');
    setIsProcessing(false);
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="bg-white border-b border-gray-200">
          <div className="container-base py-6">
            <h1 className="text-3xl font-bold">Checkout</h1>
          </div>
        </div>

        <div className="container-base py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
            {/* Order Form */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Delivery Details</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input-base"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-base"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input-base"
                    placeholder="+254712345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Area *</label>
                  <select
                    name="area"
                    required
                    value={formData.area}
                    onChange={handleInputChange}
                    className="input-base"
                  >
                    <option value="">Select area...</option>
                    <option value="nairobi-central">Nairobi Central</option>
                    <option value="westlands">Westlands</option>
                    <option value="karen">Karen</option>
                    <option value="langata">Langata</option>
                    <option value="spring-valley">Spring Valley</option>
                    <option value="upper-hill">Upper Hill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="input-base"
                    placeholder="123 Main Street, Apartment 4B"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary w-full text-lg py-3 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Pay with M-PESA'}
                </button>
              </form>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="flex justify-between">
                    <span>Farm Fresh Eggs - Tray x1</span>
                    <span className="font-medium">KSh 650</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Live Broiler Chicken x1</span>
                    <span className="font-medium">KSh 850</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Day-Old Chicks (50) x1</span>
                    <span className="font-medium">KSh 450</span>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Promo Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="FRESH15"
                      className="flex-1 input-base"
                    />
                    <button className="btn-secondary px-4">Apply</button>
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>KSh {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery</span>
                    <span>KSh {deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-700 font-medium">
                    <span>Discount (15%)</span>
                    <span>-KSh {discount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-green-700">KSh {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
