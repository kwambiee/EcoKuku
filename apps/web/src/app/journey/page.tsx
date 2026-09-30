import { db } from '@ecokuku/db';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Shield, Droplets, Wind } from 'lucide-react';
import JourneyTimeline from './JourneyTimeline';

async function getFarmStats() {
  try {
    const [activeBatches, birdStats, nextReady, openBatches] = await Promise.all([
      db.batch.count({ where: { status: 'ACTIVE' } }),
      db.batch.aggregate({ _sum: { currentCount: true }, where: { status: 'ACTIVE' } }),
      db.batch.findFirst({
        where: { status: 'ACTIVE', expectedReady: { not: null } },
        orderBy: { expectedReady: 'asc' },
        select: { expectedReady: true, type: true, breed: true },
      }),
      db.batch.findMany({
        where: { isOpenForBooking: true, status: 'ACTIVE' },
        select: {
          id: true, batchNumber: true, type: true, breed: true,
          currentCount: true, startDate: true, expectedReady: true,
          pricePerChick: true, bookedCount: true, maxBookings: true,
        },
        orderBy: { startDate: 'desc' },
        take: 4,
      }),
    ]);
    return { activeBatches, totalBirds: birdStats._sum.currentCount ?? 0, nextReady, openBatches };
  } catch {
    return { activeBatches: 0, totalBirds: 0, nextReady: null, openBatches: [] };
  }
}

const TYPE_LABEL: Record<string, string> = {
  BROILER: 'Broiler', LAYER: 'Layer', KIENYEJI: 'Kienyeji', CHICK: 'Chick',
};

function formatDate(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function JourneyPage() {
  const { activeBatches, totalBirds, nextReady, openBatches } = await getFarmStats();

  const HYGIENE = [
    {
      Icon: Shield,
      title: 'Biosecurity Protocols',
      desc: 'Visitors wear boot covers before entering any pen. Hands washed and disinfected at every checkpoint. No outside birds ever brought into contact with our flock.',
    },
    {
      Icon: Droplets,
      title: 'Water & Feed Safety',
      desc: 'Drinkers cleaned and refilled twice daily. Feed stored in sealed bins, checked for mould. Water nipples are chlorinated weekly.',
    },
    {
      Icon: Wind,
      title: 'Ventilation & Space',
      desc: 'Pens are designed for natural ventilation. Bird density is kept below recommended maximums. Bedding is turned daily and fully replaced between batches.',
    },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">

        {/* ── HERO ── */}
        <div className="py-16 px-4" style={{ background: 'var(--forest)' }}>
          <div className="container-base max-w-3xl text-center mx-auto">
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-4 text-white/50">Farm Transparency</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 leading-tight" style={{ textWrap: 'balance' }}>
              From egg to your door —<br />
              <span style={{ color: '#FFCC44' }}>every step, no secrets.</span>
            </h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              This is what happens on the farm before your chicks arrive. Select a bird type below to follow the full journey.
            </p>
          </div>
        </div>

        {/* ── LIVE FACTS STRIP ── */}
        <div style={{ background: 'var(--forest-dark)' }}>
          <div className="container-base py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x divide-white/10">
              {[
                { stat: activeBatches > 0 ? `${activeBatches}` : '—', label: 'Active batches' },
                { stat: totalBirds > 0 ? totalBirds.toLocaleString() : '—', label: 'Birds on farm now' },
                {
                  stat: nextReady?.expectedReady ? formatDate(nextReady.expectedReady) : 'TBC',
                  label: nextReady ? `Next ${TYPE_LABEL[nextReady.type] || ''} batch ready` : 'Next batch ready',
                },
                { stat: openBatches.length > 0 ? `${openBatches.length}` : '0', label: 'Batches open for booking' },
              ].map((f) => (
                <div key={f.label} className="text-center md:px-8">
                  <div className="font-display font-bold text-2xl text-white">{f.stat}</div>
                  <div className="text-xs text-white/40 mt-1 leading-tight">{f.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BREED TIMELINE ── */}
        <section className="py-16 md:py-24 px-4" style={{ background: 'var(--cream)' }}>
          <div className="container-base max-w-3xl mx-auto">
            <div className="mb-12">
              <p className="eyebrow mb-3">How we raise birds</p>
              <h2 className="font-display text-4xl font-bold mb-3" style={{ color: 'var(--text-dark)' }}>
                Follow the full journey
              </h2>
              <p style={{ color: 'var(--text-soft)' }} className="text-base max-w-lg">
                Select the bird type you are interested in. Every stage is what actually happens on this farm.
              </p>
            </div>
            <JourneyTimeline />
          </div>
        </section>

        {/* ── BATCH PASSPORT ── */}
        {openBatches.length > 0 && (
          <section className="py-16 px-4 border-t" style={{ background: '#fff', borderColor: 'var(--cream-dark)' }}>
            <div className="container-base">
              <div className="mb-10">
                <p className="eyebrow mb-3">Batch Passport</p>
                <h2 className="font-display text-4xl font-bold mb-2" style={{ color: 'var(--text-dark)' }}>
                  What&apos;s on the farm today
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
                  These live batches are open for booking. Real numbers, updated by the farm.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {openBatches.map((b) => {
                  const ageInDays = Math.floor((Date.now() - new Date(b.startDate).getTime()) / 86_400_000);
                  const spotsLeft = b.maxBookings != null ? Math.max(0, b.maxBookings - b.bookedCount) : null;
                  return (
                    <div key={b.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--cream-dark)' }}>
                      <div className="p-4" style={{ background: 'var(--forest)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-white/40 font-mono">{b.batchNumber}</p>
                            <h3 className="font-bold text-white">{TYPE_LABEL[b.type] || b.type}{b.breed ? ` · ${b.breed}` : ''}</h3>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-400/20 text-green-300">{ageInDays}d old</span>
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <div className="space-y-1 text-sm mb-4" style={{ color: 'var(--text-soft)' }}>
                          <div className="flex justify-between">
                            <span>Birds available</span>
                            <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>{b.currentCount.toLocaleString()}</span>
                          </div>
                          {b.pricePerChick && (
                            <div className="flex justify-between">
                              <span>Price / chick</span>
                              <span className="font-bold" style={{ color: 'var(--amber-dark)' }}>KSh {Number(b.pricePerChick).toLocaleString()}</span>
                            </div>
                          )}
                          {b.expectedReady && (
                            <div className="flex justify-between">
                              <span>Ready by</span>
                              <span className="font-semibold" style={{ color: 'var(--text-dark)' }}>{formatDate(b.expectedReady)}</span>
                            </div>
                          )}
                          {spotsLeft !== null && (
                            <div className="flex justify-between">
                              <span>Booking spots</span>
                              <span className="font-bold" style={{ color: spotsLeft < 5 ? '#DC2626' : 'var(--forest)' }}>
                                {spotsLeft} left
                              </span>
                            </div>
                          )}
                        </div>
                        <a
                          href="/#book"
                          className="flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                          style={{ background: 'var(--forest)' }}
                        >
                          Book this batch →
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── HYGIENE & BIOSECURITY ── */}
        <section className="py-16 px-4 border-t" style={{ background: 'var(--forest-light)', borderColor: 'var(--cream-dark)' }}>
          <div className="container-base max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="eyebrow mb-3">Hygiene & Biosecurity</p>
              <h2 className="font-display text-3xl font-bold" style={{ color: 'var(--text-dark)' }}>
                Clean farm, healthy birds.
              </h2>
              <p className="text-sm mt-2 max-w-lg mx-auto" style={{ color: 'var(--text-soft)' }}>
                Biosecurity is what separates a reliable farm from one that surprises you with sick birds. Here is what we do.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {HYGIENE.map(({ Icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: 'var(--cream-dark)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--forest-light)' }}>
                    <Icon className="w-5 h-5" style={{ color: 'var(--forest)' }} />
                  </div>
                  <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--text-dark)' }}>{title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-soft)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MAP & LOCATION ── */}
        <section className="py-16 px-4 border-t" style={{ background: '#fff', borderColor: 'var(--cream-dark)' }}>
          <div className="container-base max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                <p className="eyebrow mb-3">Find Us</p>
                <h2 className="font-display text-3xl font-bold mb-4" style={{ color: 'var(--text-dark)' }}>
                  We&apos;re in Makina, Kibera.
                </h2>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-mid)' }}>
                  The farm is in Makina village within Kibera, Nairobi. When you book, we send you our precise
                  location pin on WhatsApp. Collection is usually same-day or next morning.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    { label: 'Area', value: 'Makina, Kibera, Nairobi' },
                    { label: 'How to reach us', value: 'Book via form or WhatsApp — we send you the pin' },
                    { label: 'Phone', value: '0182 193 380' },
                    { label: 'Farm visits', value: 'Welcome — call ahead to schedule' },
                  ].map((row) => (
                    <div key={row.label} className="flex gap-3 text-sm">
                      <span className="font-bold w-28 flex-shrink-0" style={{ color: 'var(--text-soft)' }}>{row.label}</span>
                      <span style={{ color: 'var(--text-dark)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://wa.me/254182193380?text=Hello!%20I%20would%20like%20to%20visit%20Kwamboka%20Poultry%20Farm.%20Can%20you%20send%20me%20the%20location%20pin?"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-amber px-6 py-3"
                  >
                    Get location on WhatsApp
                  </a>
                  <a href="/#book" className="btn-primary px-6 py-3">
                    Book Chicks
                  </a>
                </div>
              </div>

              {/* Map iframe */}
              <div className="rounded-2xl overflow-hidden border shadow-sm" style={{ borderColor: 'var(--cream-dark)' }}>
                <iframe
                  title="Kwamboka Poultry Farm — Makina, Kibera"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=36.7870%2C-1.3200%2C36.8010%2C-1.3090&layer=mapnik&marker=-1.3145%2C36.7940"
                  width="100%"
                  height="360"
                  style={{ border: 'none', display: 'block' }}
                  loading="lazy"
                />
                <div className="p-3 text-xs text-center" style={{ background: 'var(--cream)', color: 'var(--text-soft)' }}>
                  Makina, Kibera, Nairobi · <a href="https://www.openstreetmap.org/?mlat=-1.3145&mlon=36.7940#map=15/-1.3145/36.7940" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--forest)' }}>View larger map</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="py-16 px-4" style={{ background: 'var(--forest)' }}>
          <div className="container-base max-w-2xl mx-auto text-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-4 text-white/50">Ready to order?</p>
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              You&apos;ve seen how we work.<br />
              <span style={{ color: '#FFCC44' }}>Now let&apos;s get you some chicks.</span>
            </h2>
            <p className="text-white/70 mb-8 text-lg">
              Submit a booking request — no payment online. We call you back to confirm quantity,
              arrange collection, and answer any questions.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="/#book" className="btn-amber px-8 py-4 text-base">
                Book Chicks Now →
              </a>
              <a
                href="https://wa.me/254182193380?text=Hello!%20I%20visited%20your%20Our%20Farm%20page%20and%20I%20am%20interested%20in%20ordering%20chicks."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-lg border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Order on WhatsApp
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
