import { db } from '@ecokuku/db';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import BookingForm from '@/components/BookingForm';
import { CheckCircle2, Phone, MapPin, Mail, Shield, Wheat, Star } from 'lucide-react';

/* ── Pricing tiers ───────────────────────────────────────────────── */
const CHICK_TIERS = [
  { age: 'Day-Old Chicks', price: 110, emoji: '🥚', sub: 'Just hatched · lowest entry price' },
  { age: '1 Week Old',     price: 150, emoji: '🐣', sub: 'Past the critical first week' },
  { age: '2 Weeks Old',    price: 190, emoji: '🐤', sub: 'Stronger · eating well' },
  { age: '3 Weeks Old',    price: 230, emoji: '🐓', sub: 'Ready to move to your farm' },
];

/* ── Services ────────────────────────────────────────────────────── */
const SERVICES = [
  { Icon: Shield,  title: 'Pure Kienyeji on Request',      desc: 'Indigenous Kienyeji chicks available on special order — ask us on WhatsApp.' },
  { Icon: Wheat,   title: 'Feed at Cost',                   desc: 'Quality starter and grower feed supplied at cost price. No markup.' },
  { Icon: Star,    title: 'Point-of-Lay & Mature Birds',    desc: 'Hens and pullets available subject to batch readiness — ask what is in stock.' },
  { Icon: Phone,   title: 'Vaccination Included',           desc: 'All chicks are vaccinated before sale. We also vaccinate existing flocks.' },
];

/* ── Why us ──────────────────────────────────────────────────────── */
const WHY = [
  { stat: '4',         label: 'Age groups available' },
  { stat: 'Kibera',    label: 'Locally raised — Makina' },
  { stat: '100%',      label: 'Vaccinated before sale' },
  { stat: 'Same day',  label: 'Callback after booking' },
];

/* ── Batch fetch ─────────────────────────────────────────────────── */
async function getAvailableBatches() {
  try {
    const rows = await db.batch.findMany({
      where: { isOpenForBooking: true, status: 'ACTIVE' },
      select: { id: true, batchNumber: true, type: true, breed: true, startDate: true, currentCount: true, maxBookings: true, bookedCount: true, pricePerChick: true },
      orderBy: { startDate: 'desc' },
      take: 6,
    });
    return rows.map((b) => ({
      ...b,
      ageInDays: Math.floor((Date.now() - new Date(b.startDate).getTime()) / 86_400_000),
      spotsLeft: b.maxBookings != null ? Math.max(0, b.maxBookings - b.bookedCount) : null,
    }));
  } catch { return []; }
}

const TYPE_LABEL: Record<string, string> = { BROILER: 'Broiler', LAYER: 'Layer', KIENYEJI: 'Kienyeji', CHICK: 'Chick' };

/* ═══════════════════════════════════════════════════════════════════ */
export default async function HomePage() {
  const batches = await getAvailableBatches();

  return (
    <>
      <Navbar />
      <main className="flex-1">

        {/* ── HERO ──────────────────────────────────────────────────
            Full-bleed photo of chicks + gradient overlay
            Palette: forest green bg, amber headline accent, white text
        ────────────────────────────────────────────────────────────── */}
        <section className="relative min-h-[580px] flex flex-col justify-end overflow-hidden">
          {/* Background photo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/farm-hero.jpg"
            alt="Healthy fluffy chicks at Kwamboka Poultry Farm, Kibera"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: '50% 28%' }}
          />
          {/* Gradient — angled heavy scrim so amber text is always readable */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(160deg, rgba(10,24,15,0.82) 0%, rgba(15,36,22,0.68) 35%, rgba(12,28,18,0.90) 70%, rgba(10,22,14,1) 100%)',
            }}
          />

          {/* Content sits over gradient */}
          <div className="relative z-10 container-base pb-14 pt-20">
            <div className="max-w-2xl">
              {/* Eyebrow */}
              <p className="text-xs font-bold tracking-[0.2em] uppercase mb-3 text-white/60">
                Kwamboka Poultry Farm · Makina, Kibera
              </p>

              {/* Main headline */}
              <h1
                className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-5"
                style={{ textWrap: 'balance', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
              >
                Healthy Chicks for a<br />
                <span style={{ color: '#FFCC44', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>Brighter Tomorrow</span>
              </h1>

              <p className="text-white/80 text-lg leading-relaxed mb-2 max-w-xl">
                Strong, vaccinated chicks raised right here in Kibera. Choose your age group,
                submit your details, and we call you back to confirm.
              </p>
              <p className="font-display italic text-lg mb-8" style={{ color: '#FFCC44', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                By Kibera, for Kibera.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <a href="#book" className="btn-amber px-8 py-3.5 text-base shadow-lg">
                  Book Your Chicks
                </a>
                <a
                  href="https://wa.me/254182193380?text=Hello%20Kwamboka%20Poultry!%20I%20would%20like%20to%20order%20chicks."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Us
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST BAR ─────────────────────────────────────────────
            Dark forest strip with 4 stats — like Green Valley reference
        ────────────────────────────────────────────────────────────── */}
        <section style={{ background: 'var(--forest-dark)' }}>
          <div className="container-base py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/10">
              {WHY.map((w) => (
                <div key={w.label} className="text-center md:px-8">
                  <div className="font-display font-bold text-2xl md:text-3xl text-white">{w.stat}</div>
                  <div className="text-xs text-white/50 mt-1 tracking-wide">{w.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CHICK PRICES BY AGE ───────────────────────────────────
            Cream bg · 4 cards · amber price badge
        ────────────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-24" style={{ background: 'var(--cream)' }}>
          <div className="container-base">
            {/* Section header */}
            <div className="text-center mb-12">
              <p className="eyebrow mb-3">Chick Prices by Age</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-3" style={{ color: 'var(--text-dark)' }}>
                Pick your age group
              </h2>
              <p style={{ color: 'var(--text-soft)' }} className="text-base max-w-md mx-auto">
                Healthy, vaccinated birds from our Kibera flock. Older chicks cost more — they&apos;ve
                already passed the toughest weeks.
              </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {CHICK_TIERS.map((tier, i) => (
                <div
                  key={tier.age}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border"
                  style={{ borderColor: i === 0 ? 'var(--amber)' : 'var(--cream-dark)', borderWidth: i === 0 ? 2 : 1 }}
                >
                  {/* Image / photo area — warm amber-tinted gradient matching chick feather tone */}
                  <div
                    className="h-40 flex items-center justify-center text-7xl relative overflow-hidden"
                    style={{
                      background: i === 0
                        ? 'linear-gradient(135deg, #F5D98A 0%, #E8B84B 50%, #C9841A 100%)'
                        : i === 1
                        ? 'linear-gradient(135deg, #D4A855 0%, #B8872A 50%, #9A6E1A 100%)'
                        : i === 2
                        ? 'linear-gradient(135deg, #8DAA7A 0%, #5A7D4A 50%, #3D6030 100%)'
                        : 'linear-gradient(135deg, #7A6550 0%, #5A4A38 50%, #3D3020 100%)',
                    }}
                  >
                    {/* Subtle grain texture */}
                    <div className="absolute inset-0 opacity-20"
                      style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '6px 6px' }} />
                    <span className="relative z-10 drop-shadow-md">{tier.emoji}</span>

                    {/* Best value badge on first card */}
                    {i === 0 && (
                      <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full text-white" style={{ background: 'var(--forest)' }}>
                        Lowest price
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-dark)' }}>{tier.age}</h3>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-soft)' }}>{tier.sub}</p>

                    {/* Price badge */}
                    <div className="rounded-xl px-4 py-3 text-center" style={{ background: 'var(--amber-light)' }}>
                      <span className="font-display font-bold text-2xl" style={{ color: 'var(--amber-dark)' }}>
                        KSh {tier.price}
                      </span>
                      <span className="text-xs ml-1" style={{ color: 'var(--amber)' }}>/ chick</span>
                    </div>

                    <a
                      href="#book"
                      className="mt-3 flex items-center justify-center w-full py-2.5 rounded-lg text-sm font-semibold transition-colors bg-[#EBF5EE] text-[#1B4D2E] hover:bg-[#1B4D2E] hover:text-white"
                    >
                      Book these →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BOOKING FORM ──────────────────────────────────────────
            White bg · two-column layout like Green Valley reference
        ────────────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-24 border-t" style={{ background: '#fff', borderColor: 'var(--cream-dark)' }} id="book">
          <div className="container-base">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

              {/* Left — copy + contact info */}
              <div>
                <p className="eyebrow mb-3">Book Your Chicks</p>
                <h2 className="font-display text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--text-dark)' }}>
                  Ready to order?<br/>Fill in your details.
                </h2>
                <p style={{ color: 'var(--text-mid)' }} className="leading-relaxed mb-8">
                  No online payment — just your name and number. We call you back to confirm
                  availability, discuss quantity, and arrange collection from Makina, Kibera
                  or delivery to your location.
                </p>

                <ul className="space-y-3 mb-10">
                  {[
                    'All 4 chick age groups available',
                    'Pure Kienyeji on request',
                    'Vaccination included before sale',
                    'Feed available at cost price',
                    'Incubation service with deposit',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-mid)' }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--forest-light)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--forest)' }} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Contact card */}
                <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--forest)', color: '#fff' }}>
                  <h3 className="font-bold text-sm uppercase tracking-widest text-white/60 mb-2">Contact us directly</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider">Call / WhatsApp</p>
                      <a href="tel:+254182193380" className="font-bold text-lg" style={{ color: 'var(--amber)' }}>0182 193 380</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider">Visit us</p>
                      <p className="font-semibold text-sm text-white">Makina, Kibera</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wider">Email</p>
                      <a href="mailto:info@kwambokapoultry.co.ke" className="text-sm text-white/80 hover:text-white">info@kwambokapoultry.co.ke</a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right — booking form on a cream card */}
              <div className="rounded-2xl p-6 md:p-8 shadow-sm border" style={{ background: 'var(--cream)', borderColor: 'var(--cream-dark)' }}>
                <h3 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--text-dark)' }}>Submit booking request</h3>
                <BookingForm />
              </div>
            </div>
          </div>
        </section>

        {/* ── LIVE AVAILABILITY ─────────────────────────────────────
            Only shown when batches are marked open for booking
        ────────────────────────────────────────────────────────────── */}
        {batches.length > 0 && (
          <section className="py-16 md:py-20 border-t" style={{ background: 'var(--cream)', borderColor: 'var(--cream-dark)' }}>
            <div className="container-base">
              <p className="eyebrow mb-2">Current stock</p>
              <h2 className="font-display text-4xl font-bold mb-2" style={{ color: 'var(--text-dark)' }}>What&apos;s available now</h2>
              <p className="text-sm mb-10" style={{ color: 'var(--text-soft)' }}>These batches are confirmed available. Book via the form above or WhatsApp.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {batches.map((b) => (
                  <div key={b.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-shadow" style={{ borderColor: 'var(--cream-dark)' }}>
                    <div className="p-4 text-white flex items-center justify-between" style={{ background: 'var(--forest)' }}>
                      <div>
                        <span className="text-2xl">🐔</span>
                        <h3 className="font-bold mt-1">{TYPE_LABEL[b.type] || b.type} Chicks</h3>
                        {b.breed && <p className="text-white/60 text-xs">{b.breed}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/40">Batch</p>
                        <p className="font-mono text-xs text-white/70">{b.batchNumber}</p>
                        <p className="text-xs text-white/60 mt-1">{b.ageInDays} days old</p>
                      </div>
                    </div>
                    <div className="p-4">
                      {b.pricePerChick && (
                        <p className="font-bold text-lg mb-2" style={{ color: 'var(--amber-dark)' }}>KSh {Number(b.pricePerChick).toLocaleString()} / chick</p>
                      )}
                      <div className="flex items-center justify-between text-sm" style={{ color: 'var(--text-soft)' }}>
                        <span>{b.currentCount.toLocaleString()} birds available</span>
                        {b.spotsLeft !== null && (
                          <span className="font-semibold" style={{ color: b.spotsLeft < 10 ? '#DC2626' : 'var(--forest)' }}>
                            {b.spotsLeft} spots left
                          </span>
                        )}
                      </div>
                      <a
                        href="#book"
                        className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                        style={{ background: 'var(--forest)' }}
                      >
                        Book this batch →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── SERVICES ──────────────────────────────────────────────
            Very light green bg · 4 service cards
        ────────────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-24 border-t" style={{ background: 'var(--forest-light)', borderColor: 'var(--cream-dark)' }}>
          <div className="container-base">
            <div className="text-center mb-12">
              <p className="eyebrow mb-3">What we offer</p>
              <h2 className="font-display text-4xl font-bold" style={{ color: 'var(--text-dark)' }}>More than just chicks</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {SERVICES.map(({ Icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border flex flex-col gap-4" style={{ borderColor: 'var(--cream-dark)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--forest-light)' }}>
                    <Icon className="w-5 h-5" style={{ color: 'var(--forest)' }} />
                  </div>
                  <h3 className="font-bold text-sm leading-snug" style={{ color: 'var(--text-dark)' }}>{title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-soft)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── INCUBATION CTA ────────────────────────────────────────
            Amber-tinted warm panel
        ────────────────────────────────────────────────────────────── */}
        <section className="py-14 border-t" style={{ background: '#fff', borderColor: 'var(--cream-dark)' }}>
          <div className="container-base">
            <div
              className="rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8"
              style={{ background: 'var(--amber-light)', border: '1px solid #E8C870' }}
            >
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--amber-dark)' }}>Incubation Service</p>
                <h2 className="font-display text-3xl font-bold mb-3" style={{ color: 'var(--text-dark)' }}>
                  Need hatching eggs incubated?
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-mid)' }}>
                  Submit a deposit to reserve your incubation slot. The process takes 3–4 weeks
                  and we give you regular updates on the hatch progress.
                </p>
              </div>
              <div className="flex flex-col gap-3 flex-shrink-0">
                <a
                  href="https://wa.me/254182193380?text=Hello!%20I%20am%20interested%20in%20incubation%20services."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-amber px-7 py-3 shadow"
                >
                  Inquire on WhatsApp
                </a>
                <a href="#book" className="text-center text-sm font-semibold" style={{ color: 'var(--amber-dark)' }}>
                  Use booking form →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────
            Dark forest green · Healthy Poultry Happy Life style
        ────────────────────────────────────────────────────────────── */}
        <section className="relative py-20 overflow-hidden" style={{ background: 'var(--forest)' }}>
          {/* Subtle photo strip behind the CTA */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/farm-hero.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-10"
            style={{ objectPosition: '50% 30%' }}
          />
          <div className="relative z-10 container-base flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-2">
                Healthy Poultry,<br/>Happy Life!
              </h2>
              <p className="text-white/70 text-base mb-1">Choose quality. Choose Kwamboka Poultry Farm.</p>
              <p className="font-bold text-xl mt-3" style={{ color: 'var(--amber)' }}>0182 193 380</p>
            </div>
            <div className="rounded-2xl p-7 shadow-2xl w-full md:w-auto md:min-w-[280px]" style={{ background: '#fff' }}>
              <p className="font-bold text-base mb-1" style={{ color: 'var(--text-dark)' }}>Ready to Place an Order?</p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-soft)' }}>Contact us today for any inquiry.</p>
              <div className="flex flex-col gap-3">
                <a
                  href="tel:+254182193380"
                  className="btn-amber w-full py-3 justify-center shadow"
                >
                  <Phone className="w-4 h-4 mr-2" /> Call Now
                </a>
                <a
                  href="https://wa.me/254182193380?text=Hello%20Kwamboka%20Poultry!%20I%20would%20like%20to%20order%20chicks."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full py-3 justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white mr-2 flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Footer tagline from poster */}
          <div className="relative z-10 container-base mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-xs text-white/40 font-semibold uppercase tracking-wider">
            <span>🌿 Supporting Local Farmers</span>
            <span className="text-white/20">•</span>
            <span>🍽️ Feeding Families</span>
            <span className="text-white/20">•</span>
            <span>🏘️ Building a Healthier Community</span>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
