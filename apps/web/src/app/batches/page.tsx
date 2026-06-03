'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Calendar, Syringe, Weight, ArrowRight } from 'lucide-react';

interface Batch {
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

const TYPE_LABELS: Record<string, string> = {
  BROILER: 'Broiler',
  LAYER: 'Layer',
  KIENYEJI: 'Kienyeji',
};

const TYPE_EMOJIS: Record<string, string> = {
  BROILER: '🍗',
  LAYER: '🥚',
  KIENYEJI: '🐔',
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/batches')
      .then((r) => r.json())
      .then((d) => setBatches(d.data || []))
      .catch(() => setBatches([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-green-900 to-green-700 text-white py-16 px-4">
          <div className="container-base text-center">
            <div className="text-5xl mb-4">🐣</div>
            <h1 className="text-4xl font-bold mb-3">Book a Batch</h1>
            <p className="text-lg text-green-100 max-w-2xl mx-auto">
              Reserve your own flock directly from our farm. We raise the chicks, you track their progress — pick them up or get them delivered when ready.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-green-200">
              <span className="flex items-center gap-2">✓ 30% deposit to reserve</span>
              <span className="flex items-center gap-2">✓ Live updates on growth & vaccination</span>
              <span className="flex items-center gap-2">✓ Delivery to Nairobi areas</span>
            </div>
          </div>
        </div>

        <div className="container-base py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔜</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No batches open for booking</h2>
              <p className="text-gray-600 mb-4">Check back soon — new batches open regularly.</p>
              <Link href="/shop" className="text-green-700 font-medium underline">Browse our ready products instead</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {batches.length} batch{batches.length !== 1 ? 'es' : ''} available
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {batches.map((batch) => {
                  const booked = batch.bookedCount || 0;
                  const max = batch.maxBookings || 0;
                  const pct = max > 0 ? Math.min(100, Math.round((booked / max) * 100)) : 0;
                  const available = batch.availableSpots ?? (max > 0 ? max - booked : null);

                  return (
                    <div key={batch.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-green-400 hover:shadow-lg transition-all duration-200">
                      {/* Header */}
                      <div className="bg-gradient-to-br from-green-800 to-green-600 p-5 text-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-3xl">{TYPE_EMOJIS[batch.type] || '🐔'}</span>
                            <h3 className="font-bold text-lg mt-2">{TYPE_LABELS[batch.type]} Chicks</h3>
                            {batch.breed && <p className="text-green-200 text-sm">{batch.breed}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-green-200">Batch</p>
                            <p className="font-mono text-sm">{batch.batchNumber}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="bg-green-700/50 px-2 py-1 rounded text-green-100">
                            {batch.ageInDays} days old
                          </span>
                          {batch.pricePerChick && (
                            <span className="font-bold text-amber-200">
                              KSh {Number(batch.pricePerChick).toLocaleString()} / chick
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-5">
                        {/* Availability bar */}
                        {max > 0 && (
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>{booked} reserved</span>
                              <span>{available} spots left</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-red-400' : pct >= 50 ? 'bg-amber-400' : 'bg-green-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{pct}% booked</p>
                          </div>
                        )}

                        {/* Key info */}
                        <div className="space-y-2 text-sm text-gray-600 mb-5">
                          {batch.expectedReady && (
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-green-600 flex-shrink-0" />
                              <span>Ready {new Date(batch.expectedReady).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          )}
                          {batch.vaccinations.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Syringe size={14} className="text-green-600 flex-shrink-0" />
                              <span>Last vaccine: {batch.vaccinations[0].vaccineType}</span>
                            </div>
                          )}
                          {batch.growthLogs.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Weight size={14} className="text-green-600 flex-shrink-0" />
                              <span>Avg weight: {Number(batch.growthLogs[0].avgWeight).toFixed(2)} kg</span>
                            </div>
                          )}
                        </div>

                        <Link
                          href={`/batches/${batch.id}`}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                            available === 0
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed pointer-events-none'
                              : 'bg-green-800 text-white hover:bg-green-700'
                          }`}
                        >
                          {available === 0 ? 'Fully Booked' : 'Reserve Chicks'}
                          {available !== 0 && <ArrowRight size={16} />}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
