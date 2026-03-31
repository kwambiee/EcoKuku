'use client';

import { useCart } from '@/hooks/useCart';
import { Button } from '@ecokuku/ui';
import Link from 'next/link';
import Image from 'next/image';
import { cn, formatCurrency } from '@ecokuku/ui';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-8">
            Start shopping to add items to your cart
          </p>
          <Link href="/shop">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 bg-white rounded-lg p-4 border border-gray-200"
                >
                  {/* Product Image */}
                  <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{item.category}</p>
                    <p className="text-lg font-bold text-green-900 mt-2">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>

                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 text-gray-600 hover:text-gray-900 font-medium"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-12 text-center border-0 py-1 text-sm font-semibold text-gray-900"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1 text-gray-600 hover:text-gray-900 font-medium"
                      >
                        +
                      </button>
                    </div>

                    <p className="font-semibold text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(getTotal())}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="border-t border-gray-200 pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-900">{formatCurrency(getTotal())}</span>
              </div>
            </div>

            <Link href="/checkout" className="block w-full mb-3">
              <Button className="w-full">Proceed to Checkout</Button>
            </Link>

            <Link href="/shop" className="block text-center text-green-900 hover:text-green-800 font-medium">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
