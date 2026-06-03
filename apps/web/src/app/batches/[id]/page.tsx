'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Calendar, Syringe, Weight, ArrowLeft, CheckCircle, Smartphone } from 'lucide-react';

interface BatchDetail {
  id: string;
  batchNumber: string;
  type: string;
  breed?: string;
  ageInDays: number;
  startDate: string;
  expectedReady?: string;
  pricePerChick?: number;
  availableSpots?: number;
  maxBookings?: number;
  bookedCount: number;
  vaccinations: { vaccineType: string; dateAdministered: string }[];
  growthLogs: { avgWeight: number; date: string }[];
}

const DELIVERY_AREAS = [
  'Nairobi CBD', 'Westlands', 'Karen', 'Langata',
  'Spring Valley', 'Upper Hill', 'Kilimani', 'Lavington',
];

type Step = 'form' | 'mpesa' | 'success';

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(10);
  const [deliveryArea, setDeliveryArea] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingNumber, setBookingNumber] = useState('');

  useEffect(() => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => {
        const found = (d.data || []).find((b: BatchDetail) => b.id === id);
        setBatch(found || null);
      })
      .catch(() => setBatch(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>
        <Footer />
      </>
    );
  }

  if (!batch) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 py-20">
          <div className="text-5xl">🔍</div>
          <p className="text-gray-600">Batch not found or no longer available.</p>
          <Link href="/batches" className="text-green-700 font-medium underline">Back to available batches</Link>
        </div>
        <Footer />
      </>
    );
  }

  const pricePerChick = Number(batch.pricePerChick || 0);
  const total = pricePerChick * quantity;
  const deposit = Math.ceil(total * 0.3);
  const available = batch.availableSpots ?? (batch.maxBookings != null ? batch.maxBookings - batch.bookedCount : 9999);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push(`/auth/login?callbackUrl=/batches/${id}`);
      return;
    }
    if (quantity < 1 || quantity > available) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/batch-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batch.id, quantity, deliveryArea, notes }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Booking failed'); return; }

      setBookingNumber(data.batchOrder.orderNumber);

      // Initiate M-PESA for deposit
      const phone = (session.user as any)?.phone || '';
      const mpesaRes = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.batchOrder.id, phoneNumber: phone || '0700000000', amount: deposit }),
      });
      setStep(mpesaRes.ok ? 'mpesa' : 'success');
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'mpesa') {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white py-16 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Smartphone size={40} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Check Your Phone</h1>
            <p className="text-gray-600 mb-2">An M-PESA prompt for the 30% deposit (<strong>KSh {deposit.toLocaleString()}</strong>) has been sent.</p>
            <p className="text-gray-600 mb-8">Enter your PIN to confirm your batch reservation.</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 text-left">
              <p className="font-medium text-green-900">Booking #{bookingNumber}</p>
              <p className="text-sm text-green-700 mt-1">{quantity} {batch.type} chicks · {batch.batchNumber}</p>
            </div>
            <button onClick={() => setStep('success')} className="w-full py-3 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 mb-3">
              I've paid the deposit
            </button>
            <Link href="/my-flock" className="text-sm text-green-700 underline">Go to My Flock</Link>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Booking Confirmed!</h1>
            <p className="text-gray-600 mb-8">
              Your booking <strong>#{bookingNumber}</strong> for {quantity} {batch.type} chicks is confirmed. Track their progress on <strong>My Flock</strong>.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/my-flock" className="flex-1 py-3 bg-green-700 text-white rounded-lg font-semibold text-center hover:bg-green-800">
                Track My Flock
              </Link>
              <Link href="/batches" className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold text-center hover:bg-gray-50">
                Browse More
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
      <main className="flex-1 bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/batches" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-green-800 mb-6 font-medium">
            <ArrowLeft size={16} /> Back to available batches
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Batch Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header card */}
              <div className="bg-gradient-to-br from-green-900 to-green-700 text-white rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-green-200 text-sm mb-1">{batch.batchNumber}</p>
                    <h1 className="text-3xl font-bold">{batch.type} Chicks</h1>
                    {batch.breed && <p className="text-green-200 mt-1">{batch.breed}</p>}
                  </div>
                  <span className="bg-green-700/60 px-3 py-1.5 rounded-lg text-sm font-medium">
                    {batch.ageInDays} days old
                  </span>
                </div>
                {batch.expectedReady && (
                  <p className="mt-4 text-green-100 flex items-center gap-2">
                    <Calendar size={14} />
                    Ready by {new Date(batch.expectedReady).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4">
                {batch.vaccinations.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <Syringe size={16} />
                      <span className="text-sm font-semibold">Latest Vaccination</span>
                    </div>
                    <p className="font-bold text-gray-900">{batch.vaccinations[0].vaccineType}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(batch.vaccinations[0].dateAdministered).toLocaleDateString('en-KE')}
                    </p>
                  </div>
                )}
                {batch.growthLogs.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <Weight size={16} />
                      <span className="text-sm font-semibold">Current Weight</span>
                    </div>
                    <p className="font-bold text-gray-900">{Number(batch.growthLogs[0].avgWeight).toFixed(2)} kg avg</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Recorded {new Date(batch.growthLogs[0].date).toLocaleDateString('en-KE')}
                    </p>
                  </div>
                )}
              </div>

              {/* What's included */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-lg mb-4">What's included</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {['Regular vaccination & health checks', 'Growth tracking updates on My Flock', 'Organic feed throughout the growing cycle', 'Delivery to your area when ready', '30% deposit to reserve, balance on delivery'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Booking Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Reserve Your Chicks</h2>
                {pricePerChick > 0 && (
                  <p className="text-green-700 font-semibold mb-4">KSh {pricePerChick.toLocaleString()} per chick</p>
                )}

                {!session && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <Link href={`/auth/login?callbackUrl=/batches/${id}`} className="font-semibold underline">Sign in</Link> to complete your booking
                  </div>
                )}

                <form onSubmit={handleBook} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Number of Chicks
                      {available < 9999 && <span className="text-gray-500 font-normal ml-2">({available} available)</span>}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={available}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Area</label>
                    <select
                      value={deliveryArea}
                      onChange={(e) => setDeliveryArea(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    >
                      <option value="">Select area (optional)</option>
                      {DELIVERY_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Any special requests..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                  </div>

                  {pricePerChick > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{quantity} × KSh {pricePerChick.toLocaleString()}</span>
                        <span className="font-medium">KSh {total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-green-800 pt-1 border-t border-green-200">
                        <span>Deposit (30%)</span>
                        <span>KSh {deposit.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || available === 0}
                    className="w-full py-3 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Processing...' : `Reserve & Pay Deposit`}
                  </button>

                  <p className="text-xs text-gray-500 text-center">Balance due upon delivery</p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
