'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@ecokuku/ui';
import { AlertCircle, CheckCircle, Smartphone } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const DELIVERY_AREAS = [
  { value: 'nairobi-cbd', label: 'Nairobi CBD' },
  { value: 'westlands', label: 'Westlands' },
  { value: 'karen', label: 'Karen' },
  { value: 'langata', label: 'Langata' },
  { value: 'spring-valley', label: 'Spring Valley' },
  { value: 'upper-hill', label: 'Upper Hill' },
  { value: 'kilimani', label: 'Kilimani' },
  { value: 'lavington', label: 'Lavington' },
];

type CheckoutStep = 'form' | 'mpesa-pending' | 'success';

export default function CheckoutPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { items, getTotal, clearCart } = useCart();
  const [hydrated, setHydrated] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    area: '',
  });

  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<CheckoutStep>('form');
  const [orderId, setOrderId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user?.name || prev.name,
        email: session.user?.email || prev.email,
      }));
    }
  }, [session]);

  const subtotal = hydrated ? getTotal() : 0;
  const deliveryFee = subtotal > 0 ? 200 : 0;
  const total = subtotal + deliveryFee - promoDiscount;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    setPromoError('');
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.toUpperCase(), orderTotal: subtotal }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setPromoDiscount(data.discountAmount);
      } else {
        setPromoError(data.error || 'Invalid promo code');
        setPromoDiscount(0);
      }
    } catch {
      setPromoError('Failed to validate promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      router.push('/auth/login?callbackUrl=/checkout');
      return;
    }

    if (!formData.name || !formData.email || !formData.phone || !formData.area || !formData.address) {
      return;
    }

    if (!hydrated || items.length === 0) {
      return;
    }

    setIsProcessing(true);
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          deliveryAddress: formData.address,
          deliveryArea: formData.area,
          notes: '',
          promoCode: promoDiscount > 0 ? promoCode : undefined,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        alert(err.error || 'Failed to place order');
        return;
      }

      const orderData = await orderRes.json();
      const createdOrderId = orderData.order.id;
      const createdOrderNumber = orderData.order.orderNumber;
      setOrderId(createdOrderId);
      setOrderNumber(createdOrderNumber);

      // Initiate M-PESA STK push
      const mpesaRes = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createdOrderId,
          phoneNumber: formData.phone,
          amount: total,
        }),
      });

      if (mpesaRes.ok) {
        setStep('mpesa-pending');
      } else {
        // Order was created; payment will need to be retried
        setStep('success');
        clearCart();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentConfirmed = () => {
    clearCart();
    setStep('success');
  };

  const formatCurrency = (value: number) => `KSh ${value.toLocaleString()}`;

  if (!hydrated) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
        <Footer />
      </>
    );
  }

  if (hydrated && items.length === 0 && step === 'form') {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white py-16 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-6">🛒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Your cart is empty</h1>
            <p className="text-gray-600 mb-8">Add some products before checking out.</p>
            <Link href="/shop">
              <Button className="bg-green-600 text-white hover:bg-green-700">Browse Products</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (step === 'mpesa-pending') {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white py-16 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Smartphone size={40} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Check Your Phone</h1>
            <p className="text-gray-600 mb-2">
              An M-PESA payment request for <strong>{formatCurrency(total)}</strong> has been sent to{' '}
              <strong>{formData.phone}</strong>.
            </p>
            <p className="text-gray-600 mb-8">Enter your M-PESA PIN to complete the payment.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-left">
              <p className="text-sm text-amber-800 font-medium">Order #{orderNumber}</p>
              <p className="text-xs text-amber-700 mt-1">Keep this page open until you receive a confirmation SMS.</p>
            </div>
            <button
              onClick={handlePaymentConfirmed}
              className="w-full mb-3 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              I've completed the payment
            </button>
            <Link href={`/orders/${orderId}`} className="text-sm text-green-700 underline">
              View order details
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (step === 'success') {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white py-16 px-4">
          <div className="max-w-md mx-auto text-center">
            <CheckCircle size={64} className="mx-auto text-green-600 mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Confirmed!</h1>
            <p className="text-gray-600 mb-2">Order <strong>#{orderNumber}</strong> has been placed.</p>
            <p className="text-gray-600 mb-8">
              We'll send updates to <strong>{formData.email}</strong>
            </p>
            <div className="flex gap-3 justify-center">
              <Link href={`/orders/${orderId}`}>
                <Button className="bg-green-600 text-white hover:bg-green-700">Track Order</Button>
              </Link>
              <Link href="/shop">
                <Button variant="secondary">Continue Shopping</Button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
            <p className="text-gray-600">Complete your order</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Summary — top on mobile */}
            <div className="lg:hidden bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4 pb-4 border-b">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} ×{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold mb-6">Delivery Information</h2>

                {!session && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      <Link href="/auth/login?callbackUrl=/checkout" className="font-semibold underline">Sign in</Link> for faster checkout and order tracking.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                      <input type="text" name="name" required value={formData.name} onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                      <input type="email" name="email" required value={formData.email} onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="your@email.com" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      M-PESA Phone Number *
                    </label>
                    <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0712345678" />
                    <p className="text-xs text-gray-500 mt-1">Payment will be sent to this number via M-PESA</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Area *</label>
                      <select name="area" required value={formData.area} onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="">Select area...</option>
                        {DELIVERY_AREAS.map((a) => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address *</label>
                      <input type="text" name="address" required value={formData.address} onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="123 Main Street" />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
                    <div className="space-y-3">
                      <label className="flex items-center p-4 border-2 border-green-500 rounded-lg bg-green-50 cursor-pointer">
                        <input type="radio" name="paymentMethod" value="mpesa" defaultChecked readOnly className="mr-3" />
                        <div>
                          <p className="font-semibold text-gray-900">M-PESA</p>
                          <p className="text-sm text-gray-600">Pay via M-PESA STK push to your phone</p>
                        </div>
                      </label>
                      <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-not-allowed opacity-50">
                        <input type="radio" name="paymentMethod" value="card" disabled className="mr-3" />
                        <div>
                          <p className="font-semibold text-gray-900">Credit/Debit Card</p>
                          <p className="text-sm text-gray-600">Coming soon</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-6 border-t">
                    <Button type="submit" disabled={isProcessing}
                      className="w-full bg-green-600 text-white hover:bg-green-700 py-3 text-lg font-semibold disabled:opacity-50">
                      {isProcessing ? 'Processing...' : `Pay ${formatCurrency(total)} via M-PESA`}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Order Summary Sidebar — desktop */}
            <div className="hidden lg:block bg-white rounded-lg border border-gray-200 p-6 h-fit sticky top-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 pb-6 border-b">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} ×{item.quantity}</span>
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
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={isApplyingPromo}
                    className="px-4 py-2 bg-green-800 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                  >
                    {isApplyingPromo ? '...' : 'Apply'}
                  </button>
                </div>
                {promoError && <p className="text-xs text-red-600 mt-1">{promoError}</p>}
                {promoDiscount > 0 && (
                  <p className="text-xs text-green-600 mt-1 font-medium">✓ Promo applied — saving {formatCurrency(promoDiscount)}</p>
                )}
              </div>

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

              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Total</span>
                <span className="text-green-600">{formatCurrency(total)}</span>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg flex gap-3">
                <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  By placing this order you agree to our Terms & Conditions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
