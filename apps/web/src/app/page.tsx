import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

/* ─────────────────────────────────────────
   Category tiles  (Bellows-inspired)
───────────────────────────────────────── */
const CATEGORIES = [
  { label: 'Eggs',          sub: 'Collected daily',     emoji: '🥚', href: '/shop?category=EGGS' },
  { label: 'Live Poultry',  sub: 'Free-range birds',    emoji: '🐔', href: '/shop?category=LIVE_POULTRY' },
  { label: 'Dressed Chicken', sub: 'Ready to cook',     emoji: '🍗', href: '/shop?category=DRESSED_MEAT' },
  { label: 'Day-Old Chicks', sub: 'Multiple breeds',    emoji: '🐣', href: '/shop?category=CHICKS' },
  { label: 'Book a Batch',   sub: 'Reserve your flock', emoji: '🐓', href: '/batches' },
];

/* ─────────────────────────────────────────
   Testimonials
───────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: "I've ordered eggs from Kwamboka every week for six months. They arrive the morning they're collected — you can taste the difference from supermarket eggs.",
    name: 'Wanjiku M.',
    detail: 'Westlands · weekly egg customer',
  },
  {
    quote: "I booked a batch of Cobb 500 broilers for my restaurant. The live tracking let me plan my menu weeks in advance knowing exactly when they'd be ready.",
    name: 'James O.',
    detail: 'Restaurant owner, Kilimani',
  },
  {
    quote: "Ordered Kuroiler chicks for our farm upcountry. The farm was responsive on WhatsApp and the chicks arrived healthy. Six months on — still thriving.",
    name: 'Mercy K.',
    detail: 'Small-scale farmer, Kiambu',
  },
];

/* ─────────────────────────────────────────
   Why us features
───────────────────────────────────────── */
const FEATURES = [
  { icon: '🚫',  title: 'Zero antibiotics, ever',         desc: 'Not one bird on this farm has received antibiotics or growth hormones. That\'s a hard rule.' },
  { icon: '⏱️', title: 'Delivered the same day',          desc: 'Eggs collected in the morning, at your door by afternoon. Chicken slaughtered to order.' },
  { icon: '💉',  title: 'Vet-supervised health',          desc: 'Every flock follows a vet-recommended schedule. Health logs are kept daily, viewable in My Flock.' },
  { icon: '📲',  title: 'Track your own batch live',       desc: 'Book chicks and watch them grow — vaccinations, weight milestones, health events — all in real time.' },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">

        {/* ── HERO ──────────────────────────────────────────────── */}
        {/* Light editorial background — green lives in the nav, not here */}
        <section className="bg-gray-50 border-b border-gray-200 pt-16 pb-0">
          <div className="container-base">
            <div className="max-w-3xl mx-auto text-center pb-14">
              <p className="eyebrow mb-5">Kwamboka Poultry Farm · Nairobi, Kenya</p>
              <h1 className="font-display text-5xl md:text-7xl font-bold text-gray-800 leading-[1.08] mb-6" style={{ textWrap: 'balance' }}>
                Chicken you can<br />
                <em className="not-italic text-green-800">actually trust.</em>
              </h1>
              <p className="text-gray-600 text-lg md:text-xl leading-relaxed mb-8 max-w-xl mx-auto">
                Free-range broilers, layers, and kienyeji raised in Nairobi without antibiotics.
                Order products for same-day delivery, or reserve your own flock and track it live.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/shop" className="btn-primary">
                  Shop now <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
                <Link href="/breeds" className="btn-secondary">Explore our breeds</Link>
              </div>
            </div>

            {/* ── CATEGORY TILES (Bellows-style) ── */}
            <div className="border-t border-gray-200">
              <p className="eyebrow pt-8 pb-5 text-center">Browse the farm</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-gray-200 border-t border-gray-200">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.label}
                    href={cat.href}
                    className="group bg-gray-50 hover:bg-white transition-colors p-6 flex flex-col items-center text-center gap-2"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-200 inline-block">
                      {cat.emoji}
                    </span>
                    <span className="font-semibold text-gray-800 text-sm leading-tight">{cat.label}</span>
                    <span className="text-xs text-gray-400">{cat.sub}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR (Bellows dark stripe) ─────────────────── */}
        <section className="bg-green-900 text-white">
          <div className="container-base py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-green-800">
              {[
                { num: '0',    label: 'Antibiotics ever used' },
                { num: '6',    label: 'Breeds available now' },
                { num: '2 hrs', label: 'Avg Nairobi delivery' },
                { num: 'Live', label: 'Batch health tracking' },
              ].map((s) => (
                <div key={s.label} className="text-center md:px-8">
                  <div className="font-display text-4xl md:text-5xl font-bold text-amber-200">{s.num}</div>
                  <div className="text-xs uppercase tracking-widest text-green-300 mt-2">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-green-800 mt-8 pt-6 flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs uppercase tracking-widest text-green-500 mr-2">Raising:</span>
              {['Cobb 500', 'Ross 308', 'Isa Brown', 'Kuroiler', 'KALRO Kienyeji', 'Kenchic Layer'].map((b) => (
                <span key={b} className="text-xs font-semibold border border-green-700 text-green-300 px-3 py-1 rounded-full hover:border-green-500 hover:text-white transition-colors">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCTS ────────────────────────────────────────── */}
        <section className="bg-white py-16 md:py-20">
          <div className="container-base">
            <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
              <div>
                <p className="eyebrow mb-2">From the farm today</p>
                <h2 className="font-display text-4xl font-bold text-gray-800">What we sell</h2>
              </div>
              <Link href="/shop" className="text-green-700 font-semibold text-sm flex items-center gap-1 hover:underline">
                View all products <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { name: 'Eggs Tray (30)',     price: 650,  emoji: '🥚', category: 'EGGS',          tag: 'Collected same morning', detail: 'Free-range brown eggs' },
                { name: 'Live Broiler',        price: 850,  emoji: '🐔', category: 'LIVE_POULTRY',  tag: 'Cobb 500 or Ross 308',   detail: 'Free-range, zero antibiotics' },
                { name: 'Dressed Chicken',     price: 1200, emoji: '🍗', category: 'DRESSED_MEAT',  tag: 'Slaughtered to order',    detail: 'Cleaned and weighed' },
                { name: 'Day-Old Chicks',      price: 150,  emoji: '🐣', category: 'CHICKS',        tag: 'Per chick',               detail: 'Multiple breeds available' },
              ].map((p) => (
                <Link
                  key={p.name}
                  href={`/shop?category=${p.category}`}
                  className="group block bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:border-green-500 hover:shadow-md transition-all duration-200"
                >
                  <div className="h-36 flex items-center justify-center text-6xl bg-gray-100 group-hover:bg-green-50 transition-colors">
                    <span className="group-hover:scale-110 transition-transform duration-200 inline-block">{p.emoji}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-1">{p.tag}</p>
                    <h3 className="font-bold text-gray-800 mb-0.5 text-sm">{p.name}</h3>
                    <p className="text-xs text-gray-400 mb-3">{p.detail}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-green-800">KSh {p.price.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 group-hover:text-green-700 transition-colors font-medium">Shop →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── BREEDS TEASER ───────────────────────────────────── */}
        <section className="bg-gray-50 py-16 md:py-20 border-t border-gray-200">
          <div className="container-base">
            <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
              <div>
                <p className="eyebrow mb-2">Not all chickens are the same</p>
                <h2 className="font-display text-4xl font-bold text-gray-800">Our breeds</h2>
              </div>
              <Link href="/breeds" className="text-green-700 font-semibold text-sm flex items-center gap-1 hover:underline">
                All 6 breeds <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  label: 'MEAT',
                  labelColor: 'bg-red-100 text-red-700',
                  name: 'Broilers',
                  breeds: 'Cobb 500 · Ross 308',
                  stat: 'Ready in 5–6 weeks',
                  emoji: '🍗',
                  desc: 'Fast-growing commercial meat birds. The choice for hotels, butcheries, and bulk buyers.',
                  href: '/breeds?purpose=meat',
                },
                {
                  label: 'EGGS',
                  labelColor: 'bg-amber-100 text-amber-700',
                  name: 'Layers',
                  breeds: 'Isa Brown · Kenchic',
                  stat: '280–300 eggs / year',
                  emoji: '🥚',
                  desc: 'High-production layers in Nairobi\'s climate. Brown eggs that fetch a better price.',
                  href: '/breeds?purpose=eggs',
                },
                {
                  label: 'DUAL',
                  labelColor: 'bg-green-100 text-green-700',
                  name: 'Kienyeji & Kuroiler',
                  breeds: 'Kuroiler · KALRO Kienyeji',
                  stat: 'Hardy, low-input birds',
                  emoji: '🐓',
                  desc: 'Indigenous breeds that forage, produce both eggs and meat, and survive without intensive housing.',
                  href: '/breeds?purpose=dual',
                },
              ].map((b) => (
                <Link
                  key={b.name}
                  href={b.href}
                  className="group block bg-white rounded-lg border border-gray-200 p-6 hover:border-green-500 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">{b.emoji}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full tracking-wider ${b.labelColor}`}>{b.label}</span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-gray-800 mb-0.5">{b.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{b.breeds}</p>
                  <p className="text-sm font-semibold text-green-700 mb-3">{b.stat}</p>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{b.desc}</p>
                  <span className="text-sm font-semibold text-green-700 group-hover:underline">Compare all breeds →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY US ──────────────────────────────────────────── */}
        <section className="bg-white py-16 md:py-20 border-t border-gray-200">
          <div className="container-base">
            <p className="eyebrow mb-3 text-center">Why Kwamboka</p>
            <h2 className="font-display text-4xl font-bold text-gray-800 text-center mb-12">
              We&apos;re not a shop.<br />We&apos;re a farm.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex flex-col gap-3">
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="font-bold text-gray-800">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BOOK A BATCH CTA ────────────────────────────────── */}
        <section className="bg-gray-50 py-16 border-t border-gray-200">
          <div className="container-base">
            <div className="bg-green-900 rounded-xl p-8 md:p-12 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="max-w-xl">
                <p className="eyebrow text-green-400 mb-3">Batch booking</p>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-3 leading-tight">
                  Want to raise your own flock?
                </h2>
                <p className="text-green-200 leading-relaxed mb-5">
                  Reserve a batch of chicks from us. We raise them, you track everything — vaccinations, weight,
                  health status — in real time via My Flock. Collect when they&apos;re ready, or arrange delivery.
                </p>
                <ul className="space-y-1.5">
                  {[
                    '30% deposit to secure your batch',
                    'Broiler, Layer, Kuroiler & Kienyeji available',
                    'Live health and growth updates',
                    'Delivery to Nairobi areas',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3 flex-shrink-0">
                <Link href="/batches" className="btn-amber text-base px-8 py-4">
                  Browse batches <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
                <Link href="/breeds" className="text-center text-green-300 text-sm hover:text-white transition-colors">
                  Compare breeds first →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS (Bellows-style) ─────────────────────── */}
        <section className="bg-white py-16 md:py-20 border-t border-gray-200">
          <div className="container-base">
            <p className="eyebrow mb-3 text-center">From our customers</p>
            <h2 className="font-display text-4xl font-bold text-gray-800 text-center mb-12">
              What people say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="bg-gray-50 rounded-lg border border-gray-200 p-7 flex flex-col">
                  {/* Large quote mark — Bellows style */}
                  <span
                    className="font-display text-7xl leading-none text-green-200 select-none -mb-2"
                    aria-hidden="true"
                  >
                    &ldquo;
                  </span>
                  <p className="text-gray-700 leading-relaxed text-sm flex-1 mb-6">{t.quote}</p>
                  <div className="border-t border-gray-200 pt-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs flex-shrink-0">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────── */}
        <section className="bg-green-900 text-white py-14 text-center">
          <div className="container-base">
            <p className="eyebrow text-green-400 mb-3">Ready to order?</p>
            <h2 className="font-display text-4xl font-bold mb-3">Fresh stock available today.</h2>
            <p className="text-green-200 mb-8 max-w-md mx-auto">
              Delivered across Nairobi. Or message us on WhatsApp — we respond within minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/shop" className="btn-amber text-sm px-7 py-3">Shop now</Link>
              <a
                href="https://wa.me/254712345678"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 border border-green-700 text-white rounded-md font-semibold text-sm hover:bg-green-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp us
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
