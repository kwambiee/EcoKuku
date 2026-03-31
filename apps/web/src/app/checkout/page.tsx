'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@ecokuku/ui';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function CheckoutPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    area: '',
  });

  const [orderItems] = useState([
    { id: '1', name: 'Free Range Eggs (30 pieces)', price: 1200, quantity: 2 },
    { id: '2', name: 'Live Broiler Chicken', price: 3500, quantity: 1 },
  ]);

  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [orderPlaced, setOrderPlaced] = useState(false);

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 200 : 0;
  const total = subtotal + deliveryFee - promoDiscount;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const applyPromo = () => {
    if (promoCode.toUpperCase() === 'WELCOME10') {
      setPromoDiscount(Math.round(subtotal * 0.1));
      alert('Promo applied! 10% off');
    } else if (promoCode.length > 0) {
      alert('Invalid promo code');
      setPromoDiscount(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.area || !formData.address) {
      alert('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate API call to create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          deliveryAddress: formData.address,
          deliveryArea: formData.area,
          items: orderItems,
          subtotal,
          deliveryFee,
          discount: promoDiscount,
          total,
          paymentMethod,
          status: 'PENDING',
        }),
      });

      if (response.ok) {
        setOrderPlaced(true);
      } else {
        alert('Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error('Order error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-white py-16 px-4">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle size={64} className="mx-auto text-green-600 mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Placed!</h1>
          <p className="text-gray-600 mb-2">Thank you for your order.</p>
          <p className="text-gray-600 mb-8">
            Confirmation has been sent to <strong>{formData.email}</strong>
          </p>
          <Link href="/">
            <Button className="bg-green-600 text-white hover:bg-green-700">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold mb-6">Delivery Information</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="+254712345678"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Delivery Area *
                    </label>
                    <select
                      name="area"
                      required
                      value={formData.area}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select delivery area...</option>
                      <option value="nairobi-cbd">Nairobi CBD</option>
                      <option value="westlands">Westlands</option>
                      <option value="karen">Karen</option>
                      <option value="langata">Langata</option>
                      <option value="spring-valley">Spring Valley</option>
                      <option value="upper-hill">Upper Hill</option>
                      <option value="kilimani">Kilimani</option>
                      <option value="lavington">Lavington</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="123 Main Street, Apt 4B"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>

                  <div className="space-y-3">
                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="mpesa"
                        checked={paymentMethod === 'mpesa'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">M-PESA</p>
                        <p className="text-sm text-gray-600">Pay via M-PESA STK push</p>
                      </div>
                    </label>

                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 opacity-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        disabled
                        className="mr-3"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">Credit/Debit Card</p>
                        <p className="text-sm text-gray-600">Coming soon</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-green-600 text-white hover:bg-green-700 py-3 text-lg font-semibold disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Place Order'}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit sticky top-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

            {/* Order Items */}
            <div className="space-y-4 mb-6 pb-6 border-b">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.name} x{item.quantity}
                  </span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Promo Code */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <label className="text-sm font-semibold text-gray-700 block mb-2">Promo Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Try WELCOME10"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 text-sm font-medium"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-3 mb-6 pb-6 border-b">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery</span>
                <span className="font-medium">{formatCurrency(deliveryFee)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Discount</span>
                  <span>−{formatCurrency(promoDiscount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-green-600">{formatCurrency(total)}</span>
            </div>

            {/* Policy Note */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg flex gap-3">
              <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                By placing this order, you agree to our Terms & Conditions and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
