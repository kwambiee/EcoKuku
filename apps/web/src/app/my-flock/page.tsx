'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Syringe, Weight, Calendar, Clock, CheckCircle, XCircle, Bell } from 'lucide-react';

interface FlockEntry {
  id: string;
  orderNumber: string;
  quantity: number;
  status: string;
  ageInDays: number;
  latestWeight: number | null;
  expectedReadyDate?: string;
  lastVaccination: { vaccineType: string; dateAdministered: string } | null;
  batch: {
    batchNumber: string;
    type: string;
    breed?: string;
    startDate: string;
    expectedReady?: string;
    vaccinations: { vaccineType: string; dateAdministered: string }[];
    growthLogs: { avgWeight: number; date: string }[];
    healthEvents: { type: string; date: string; treatment?: string; notes?: string }[];
  };
  updates: { id: string; title: string; message: string; type: string; createdAt: string }[];
}

const STATUS_STEPS = ['CONFIRMED', 'GROWING', 'READY', 'COMPLETED'];

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  CONFIRMED:       'Confirmed',
  GROWING:         'Growing',
  READY:           'Ready',
  COMPLETED:       'Completed',
  CANCELLED:       'Cancelled',
};

const TYPE_EMOJIS: Record<string, string> = {
  BROILER: '🍗',
  LAYER: '🥚',
  KIENYEJI: '🐔',
};

function LifecycleTimeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                done
                  ? current
                    ? 'bg-green-600 border-green-600 text-white ring-4 ring-green-100'
                    : 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {done && !current ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span className={`text-xs mt-1 text-center whitespace-nowrap ${done ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                {STATUS_LABELS[step]}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 w-8 mb-5 ${i < currentIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function UpdateIcon({ type }: { type: string }) {
  if (type === 'MILESTONE') return <CheckCircle size={16} className="text-green-600" />;
  if (type === 'ALERT') return <XCircle size={16} className="text-red-500" />;
  return <Bell size={16} className="text-blue-500" />;
}

export default function MyFlockPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [flock, setFlock] = useState<FlockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login?callbackUrl=/my-flock');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/my-flock')
        .then((r) => r.json())
        .then((d) => setFlock(d.data || []))
        .catch(() => setFlock([]))
        .finally(() => setIsLoading(false));
    }
  }, [session]);

  if (status === 'loading' || isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!session) return null;

  if (flock.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-white py-20 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-6">🐣</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">No Flock Yet</h1>
            <p className="text-gray-600 mb-8">Book a batch to start tracking your own chickens' growth and health.</p>
            <Link href="/batches" className="inline-block px-6 py-3 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors">
              Browse Available Batches
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 bg-gray-50 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">🐣 My Flock</h1>
            <p className="text-gray-600">Track your reserved batches and their progress</p>
          </div>

          <div className="space-y-8">
            {flock.map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Header */}
                <div className={`px-6 py-4 flex items-start justify-between ${entry.status === 'CANCELLED' ? 'bg-red-50' : 'bg-green-50'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{TYPE_EMOJIS[entry.batch.type] || '🐔'}</span>
                      <h2 className="font-bold text-lg text-gray-900">
                        {entry.quantity.toLocaleString()} {entry.batch.type} Chicks
                      </h2>
                    </div>
                    <p className="text-sm text-gray-600">
                      {entry.orderNumber} · Batch {entry.batch.batchNumber}
                      {entry.batch.breed && ` · ${entry.batch.breed}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      entry.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      entry.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {STATUS_LABELS[entry.status] || entry.status}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Lifecycle timeline */}
                  {entry.status !== 'CANCELLED' && (
                    <div className="overflow-x-auto">
                      <LifecycleTimeline status={entry.status} />
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <Clock size={18} className="mx-auto text-green-600 mb-1" />
                      <p className="text-2xl font-bold text-gray-900">{entry.ageInDays}</p>
                      <p className="text-xs text-gray-500">Days old</p>
                    </div>
                    {entry.latestWeight != null && (
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <Weight size={18} className="mx-auto text-green-600 mb-1" />
                        <p className="text-2xl font-bold text-gray-900">{Number(entry.latestWeight).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">kg avg weight</p>
                      </div>
                    )}
                    {entry.lastVaccination && (
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <Syringe size={18} className="mx-auto text-green-600 mb-1" />
                        <p className="text-sm font-bold text-gray-900 leading-tight">{entry.lastVaccination.vaccineType}</p>
                        <p className="text-xs text-gray-500">Last vaccine</p>
                      </div>
                    )}
                    {entry.batch.expectedReady && (
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <Calendar size={18} className="mx-auto text-green-600 mb-1" />
                        <p className="text-sm font-bold text-gray-900 leading-tight">
                          {new Date(entry.batch.expectedReady).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-500">Ready date</p>
                      </div>
                    )}
                  </div>

                  {/* Updates feed */}
                  {entry.updates.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Bell size={16} className="text-green-600" /> Latest Updates
                      </h3>
                      <div className="space-y-3">
                        {entry.updates.slice(0, 5).map((update) => (
                          <div key={update.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="flex-shrink-0 mt-0.5">
                              <UpdateIcon type={update.type} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900">{update.title}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{update.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(update.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vaccination history */}
                  {entry.batch.vaccinations.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Syringe size={16} className="text-green-600" /> Vaccination History
                      </h3>
                      <div className="divide-y divide-gray-100">
                        {entry.batch.vaccinations.map((v, i) => (
                          <div key={i} className="flex justify-between items-center py-2 text-sm">
                            <span className="font-medium text-gray-900">{v.vaccineType}</span>
                            <span className="text-gray-500">
                              {new Date(v.dateAdministered).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/batches" className="inline-flex items-center gap-2 text-green-700 font-medium hover:text-green-900">
              + Book another batch
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
