'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@ecokuku/ui';
import { Trash2 } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

export default function CartPage() {
  // Mock cart data - replace with context/hook
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Free Range Eggs (30 pieces)',
      price: 1200,
      quantity: 2,
      category: 'Eggs',
    },
    {
      id: '2',
      name: 'Chicken - Whole (Premium)',
      price: 3500,
      quantity: 1,
      category: 'Meat',
    },
  ]);

  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(id);
    } else {
      setCartItems(
        cartItems.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
      );
    }
  };

  const removeItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = subtotal > 0 ? 200 : 0;
  const total = subtotal + delivery - promoDiscount;

  const applyPromo = () => {
    if (promoCode.toUpperCase() === 'WELCOME10') {
      setPromoDiscount(Math.round(subtotal * 0.1));
      alert('Promo code applied! 10% off');
    } else if (promoCode.length > 0) {
      alert('Invalid promo code');
    }
  };

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white py-16 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-6">🛒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-8">Add some delicious products to get started!</p>
          <Link href="/shop">
            <Button className="bg-green-600 text-white hover:bg-green-700">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl">🥚</span>
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                    {item.category && <p className="text-sm text-gray-600 mt-1">{item.category}</p>}
                    <p className="text-lg font-bold text-green-600 mt-2">{formatCurrency(item.price)}</p>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-700 mb-4"
                    >
                      <Trash2 size={20} />
                    </button>

                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 hover:bg-gray-100 font-semibold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-10 text-center border-0 py-1 font-semibold"
                        inputMode="numeric"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1 hover:bg-gray-100 font-semibold"
                      >
                        +
                      </button>
                    </div>

                    <p className="font-semibold text-gray-900 mt-4">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>{formatCurrency(delivery)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>−{formatCurrency(promoDiscount)}</span>
                </div>
              )}
              <div className="border-t pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(total)}</span>
              </div>
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
                  onClick={applyPromo}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 text-sm font-medium"
                >
                  Apply
                </button>
              </div>
            </div>

            <Link href="/checkout" className="block w-full mb-3">
              <Button className="w-full bg-green-600 text-white hover:bg-green-700 py-3">
                Proceed to Checkout
              </Button>
            </Link>

            <Link href="/shop" className="block text-center text-green-600 hover:text-green-700 font-medium">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
