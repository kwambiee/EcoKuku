import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface Breed {
  slug: string;
  name: string;
  tagline: string;
  purpose: 'Meat' | 'Eggs' | 'Dual-Purpose';
  emoji: string;
  headerBg: string;
  readyIn: string;
  keyStats: { label: string; value: string }[];
  strengths: string[];
  watchOut: string;
  idealFor: string;
  batchType: string; // maps to /batches?type=...
}

const BREEDS: Breed[] = [
  {
    slug: 'cobb-500',
    name: 'Cobb 500 Broiler',
    tagline: "Kenya's most common commercial meat bird",
    purpose: 'Meat',
    emoji: '🍗',
    headerBg: 'from-red-900 to-red-700',
    readyIn: '5–6 weeks',
    keyStats: [
      { label: 'Market weight', value: '2.2–2.5 kg' },
      { label: 'Ready in', value: '5–6 weeks' },
      { label: 'Feed conversion', value: '~1.7 kg/kg' },
      { label: 'Purpose', value: 'Meat only' },
    ],
    strengths: [
      'Fastest growth rate of any commercial breed',
      'Excellent feed-to-meat conversion ratio',
      'Consistent size — predictable for buyers',
      'Widely available, proven in Kenyan conditions',
    ],
    watchOut: 'Needs good housing and temperature management, especially in the first 2 weeks. Not suitable for backyard free-range with minimal feed.',
    idealFor: 'Hotels, restaurants, butcheries, school feeding programs, families wanting bulk chicken at scale.',
    batchType: 'BROILER',
  },
  {
    slug: 'ross-308',
    name: 'Ross 308 Broiler',
    tagline: 'Premium meat bird — heavier carcass than Cobb at the same age',
    purpose: 'Meat',
    emoji: '🐔',
    headerBg: 'from-orange-900 to-orange-700',
    readyIn: '5–6 weeks',
    keyStats: [
      { label: 'Market weight', value: '2.4–2.7 kg' },
      { label: 'Ready in', value: '5–6 weeks' },
      { label: 'Feed conversion', value: '~1.75 kg/kg' },
      { label: 'Purpose', value: 'Meat only' },
    ],
    strengths: [
      'Slightly heavier carcass than Cobb at same age',
      'Good breast meat yield — preferred by processors',
      'Less prone to leg problems than older broiler lines',
      'Hardy once past the brooding stage',
    ],
    watchOut: 'Costs slightly more per chick than Cobb 500. Needs the same commercial housing conditions to reach its potential.',
    idealFor: 'Premium butcheries and restaurants that want heavier birds. Buyers willing to pay a small premium per kg for better yield.',
    batchType: 'BROILER',
  },
  {
    slug: 'isa-brown',
    name: 'Isa Brown',
    tagline: "The layer that built Kenya's egg industry — 300 eggs a year",
    purpose: 'Eggs',
    emoji: '🥚',
    headerBg: 'from-amber-800 to-amber-600',
    readyIn: '18–20 weeks (point of lay)',
    keyStats: [
      { label: 'Eggs per year', value: '280–300' },
      { label: 'Point of lay', value: '18–20 weeks' },
      { label: 'Egg colour', value: 'Brown' },
      { label: 'Purpose', value: 'Eggs only' },
    ],
    strengths: [
      'Highest egg production of any layer in Kenya',
      'Brown eggs preferred by Kenyan buyers — commands better price',
      'Calm, easy to manage in cage or free-range',
      'Well-adapted to Nairobi altitude and climate',
    ],
    watchOut: 'Laying tapers after 72 weeks. Plan for flock replacement to maintain consistent production.',
    idealFor: 'Commercial egg traders, households with a dedicated layer flock, hotel and supermarket egg supply contracts.',
    batchType: 'LAYER',
  },
  {
    slug: 'kenchic-layer',
    name: 'Kenchic Layer',
    tagline: 'Bred locally, proven in Kenyan smallholder farms',
    purpose: 'Eggs',
    emoji: '🥚',
    headerBg: 'from-yellow-800 to-yellow-600',
    readyIn: '18–22 weeks (point of lay)',
    keyStats: [
      { label: 'Eggs per year', value: '260–280' },
      { label: 'Point of lay', value: '18–22 weeks' },
      { label: 'Egg colour', value: 'Brown' },
      { label: 'Purpose', value: 'Eggs only' },
    ],
    strengths: [
      'Sourced from Kenchic — locally available and supported',
      'Good disease resistance, bred for Kenyan conditions',
      'Slightly lower production than Isa Brown but hardier',
      'Lower chick price makes it accessible for smallholders',
    ],
    watchOut: 'Slightly lower peak production than Isa Brown. Best on a consistent commercial feed program.',
    idealFor: 'Smallholder egg farmers, school feeding programs, community cooperatives starting a layer project.',
    batchType: 'LAYER',
  },
  {
    slug: 'kuroiler',
    name: 'Kuroiler',
    tagline: 'More productive than Kienyeji — both meat and eggs',
    purpose: 'Dual-Purpose',
    emoji: '🐓',
    headerBg: 'from-teal-900 to-teal-700',
    readyIn: '12–16 weeks (meat) · 20–24 weeks (eggs)',
    keyStats: [
      { label: 'Eggs per year', value: '120–150' },
      { label: 'Market weight', value: '1.8–2.2 kg' },
      { label: 'Ready (meat)', value: '12–16 weeks' },
      { label: 'Purpose', value: 'Meat & Eggs' },
    ],
    strengths: [
      'Far more productive than traditional Kienyeji',
      'Forages well on free-range — lower feed cost',
      'Strong disease resistance, survives varied conditions',
      'Both reasonable meat yield and egg production from one flock',
    ],
    watchOut: 'Not as fast as commercial broilers (Cobb/Ross) for meat, and not as productive as Isa Brown for eggs. But good at both.',
    idealFor: 'Village and peri-urban farmers who want a single flock doing double duty. Upcountry buyers. Families who want both eggs daily and birds for occasional slaughter.',
    batchType: 'KIENYEJI',
  },
  {
    slug: 'kalro-kienyeji',
    name: 'KALRO Kienyeji',
    tagline: 'Indigenous Kenyan breed — hardiest bird we raise',
    purpose: 'Dual-Purpose',
    emoji: '🐓',
    headerBg: 'from-green-900 to-green-700',
    readyIn: '20–28 weeks',
    keyStats: [
      { label: 'Eggs per year', value: '80–120' },
      { label: 'Market weight', value: '1.2–1.8 kg' },
      { label: 'Ready in', value: '20–28 weeks' },
      { label: 'Purpose', value: 'Meat & Eggs' },
    ],
    strengths: [
      'Survives on minimal inputs — forages naturally',
      'Extremely disease-resistant, no intensive housing needed',
      'Free-range by nature — low stress, low management',
      'Customers pay a premium for Kienyeji flavour — better margins',
    ],
    watchOut: 'Slowest growth of all breeds. You wait longer, but the end product and price premium justify it for the right market.',
    idealFor: 'Organic and backyard farms, upcountry homesteads, customers selling to premium/organic markets. Anyone who values resilience over speed.',
    batchType: 'KIENYEJI',
  },
];

const PURPOSE_STYLES: Record<string, string> = {
  Meat: 'bg-red-100 text-red-700',
  Eggs: 'bg-amber-100 text-amber-700',
  'Dual-Purpose': 'bg-green-100 text-green-700',
};

export default function BreedsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">

        {/* Hero */}
        <div className="bg-green-900 text-white py-14 px-4">
          <div className="container-base">
            <p className="text-xs font-bold tracking-widest text-green-400 uppercase mb-3">Kwamboka Poultry Farm</p>
            <h1 className="font-display text-5xl font-bold mb-3">Our Breeds</h1>
            <p className="text-green-100 max-w-2xl text-lg leading-relaxed">
              We raise six breeds — commercial broilers, high-production layers, and indigenous dual-purpose birds.
              Choosing the right breed matters. Here&apos;s everything you need to know before you book.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              {(['Meat', 'Eggs', 'Dual-Purpose'] as const).map((p) => (
                <span key={p} className={`text-xs font-bold px-3 py-1.5 rounded-full ${PURPOSE_STYLES[p]}`}>{p}</span>
              ))}
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 text-green-200">All breeds vaccination-tracked</span>
            </div>
          </div>
        </div>

        {/* Breed cards */}
        <div className="container-base py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {BREEDS.map((breed) => (
              <div key={breed.slug} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col">

                {/* Card header */}
                <div className={`bg-gradient-to-br ${breed.headerBg} p-5 text-white`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-4xl">{breed.emoji}</span>
                      <h2 className="font-display font-bold text-xl mt-2 leading-tight">{breed.name}</h2>
                      <p className="text-white/70 text-xs mt-0.5">{breed.tagline}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ml-2 ${PURPOSE_STYLES[breed.purpose]}`}>
                      {breed.purpose}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-3">
                    {breed.keyStats.slice(0, 2).map((s) => (
                      <div key={s.label}>
                        <p className="text-white/60 text-[10px] uppercase tracking-wide">{s.label}</p>
                        <p className="font-bold text-sm">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card body */}
                <div className="p-5 flex flex-col flex-1">
                  {/* All stats */}
                  <div className="grid grid-cols-2 gap-3 mb-5 pb-4 border-b border-gray-100">
                    {breed.keyStats.map((s) => (
                      <div key={s.label}>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                        <p className="font-semibold text-sm text-gray-800">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Strengths */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Why farmers choose it</p>
                    <ul className="space-y-1.5">
                      {breed.strengths.map((s) => (
                        <li key={s} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Ideal for */}
                  <div className="bg-green-50 rounded-lg p-3 mb-4">
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">Ideal for</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{breed.idealFor}</p>
                  </div>

                  {/* Watch out */}
                  <div className="bg-amber-50 rounded-lg p-3 mb-5">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Worth knowing</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{breed.watchOut}</p>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto">
                    <Link
                      href={`/batches?type=${breed.batchType}`}
                      className="block w-full text-center bg-green-800 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Book {breed.name} chicks →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom guidance */}
          <div className="mt-12 bg-green-50 border border-green-200 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Not sure which breed is right for you?</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Send us a message on WhatsApp — tell us your setup (backyard, commercial, upcountry, Nairobi), your budget,
                and whether you want meat, eggs, or both. We&apos;ll recommend the right breed for your situation. No sales pitch.
              </p>
              <a
                href="https://wa.me/254712345678?text=Hello!%20I%27d%20like%20help%20choosing%20the%20right%20breed%20for%20my%20farm."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#1ebe5d] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Ask us on WhatsApp
              </a>
            </div>
            <div className="flex-shrink-0 grid grid-cols-2 gap-3 text-center text-sm">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-2xl font-bold text-green-800">6</p>
                <p className="text-gray-500 text-xs mt-1">breeds we raise</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-2xl font-bold text-green-800">Live</p>
                <p className="text-gray-500 text-xs mt-1">batch tracking</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-2xl font-bold text-green-800">0</p>
                <p className="text-gray-500 text-xs mt-1">antibiotics used</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-2xl font-bold text-green-800">Vet</p>
                <p className="text-gray-500 text-xs mt-1">supervised health</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
