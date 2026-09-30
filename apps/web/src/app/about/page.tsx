import { db } from '@ecokuku/db';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { ContactForm } from './ContactForm';

export default async function AboutPage() {
  let inquiryCount = 0;
  let completedBatches = 0;
  let activeBirds = 0;

  try {
    const [ic, cb, bs] = await Promise.all([
      db.chickInquiry.count(),
      db.batch.count(),
      db.batch.aggregate({ _sum: { currentCount: true }, where: { status: 'ACTIVE' } }),
    ]);
    inquiryCount = ic;
    completedBatches = cb;
    activeBirds = bs._sum.currentCount ?? 0;
  } catch {
    // DB unavailable — show defaults
  }

  const STATS = [
    { value: inquiryCount > 0 ? `${inquiryCount}+` : 'Growing', label: 'Families Reached' },
    { value: completedBatches > 0 ? `${completedBatches}` : 'Several', label: 'Total Batches Started' },
    { value: activeBirds > 0 ? activeBirds.toLocaleString() : '—', label: 'Birds on Farm Today' },
    { value: 'Kibera', label: 'Locally Raised' },
  ];

  const VALUES = [
    {
      emoji: '🌿',
      title: 'Locally Grown',
      desc: 'Every chick is raised in Makina, Kibera — not trucked in from a distant industrial farm. Local means fresh, and fresh means healthy.',
    },
    {
      emoji: '💉',
      title: 'Fully Vaccinated',
      desc: 'All chicks receive Newcastle disease, Marek\'s, and Gumboro vaccines before they leave the farm. No shortcuts.',
    },
    {
      emoji: '📞',
      title: 'Straight Talk',
      desc: 'You submit your details, we call you back within hours. No online payment. No waiting. No mystery.',
    },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">

        {/* Hero */}
        <div className="py-20 px-4" style={{ background: 'var(--forest)' }}>
          <div className="container-base max-w-3xl mx-auto text-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-4 text-white/50">Our Story</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white leading-tight" style={{ textWrap: 'balance' }}>
              One Kibera family&apos;s farm,<br />
              <span style={{ color: '#FFCC44' }}>now feeding many.</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-2xl mx-auto">
              Kwamboka Poultry Farm started with a brooder the size of a bedroom and 50 day-old chicks.
              The conviction was simple: Kibera deserves a farm it can trust.
            </p>
          </div>
        </div>

        {/* Our Story */}
        <div className="py-16 px-4" style={{ background: '#fff' }}>
          <div className="container-base max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

              {/* Story text */}
              <div>
                <p className="eyebrow mb-3">How it began</p>
                <h2 className="font-display text-3xl font-bold mb-6" style={{ color: 'var(--text-dark)' }}>
                  The name means &ldquo;one who has crossed over.&rdquo;
                </h2>
                <div className="space-y-4 text-base leading-relaxed" style={{ color: 'var(--text-mid)' }}>
                  <p>
                    Kwamboka Ngesa grew up watching her mother raise chickens behind their home in Kibera — not
                    as a business, but as survival. A few hens meant eggs for breakfast. A bird sold at Christmas
                    meant school fees paid. That image never left her.
                  </p>
                  <p>
                    When the opportunity came to formalize what she had seen done informally her whole life,
                    she started small: a brooder pen, 50 day-old chicks, and the conviction that Kibera
                    deserved a poultry farm it could actually trust — one that wouldn&apos;t cut corners on
                    vaccination, wouldn&apos;t pretend birds were healthy when they weren&apos;t, and
                    wouldn&apos;t sell sick stock to neighbours.
                  </p>
                  <p>
                    What began as a personal mission is now the farm behind the chicks in hundreds of Nairobi
                    households. We still raise every bird from day one — hatching in our own incubators,
                    brooding under careful watch, vaccinating before any chick leaves the farm. No shortcuts.
                  </p>
                  <p className="font-semibold" style={{ color: 'var(--forest)' }}>
                    The name Kwamboka means &ldquo;one who has crossed over&rdquo; — from struggle to something
                    steadier. That&apos;s the whole story in a single word.
                  </p>
                </div>
              </div>

              {/* Stats card */}
              <div>
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--cream-dark)' }}>
                  <div className="p-6" style={{ background: 'var(--forest)' }}>
                    <div className="text-4xl mb-2">🐓</div>
                    <h3 className="font-bold text-white text-lg">By the numbers</h3>
                    <p className="text-white/50 text-sm">Live data from our farm.</p>
                  </div>
                  <div className="grid grid-cols-2" style={{ background: 'var(--cream)' }}>
                    {STATS.map((stat, i) => (
                      <div
                        key={stat.label}
                        className="p-6 flex flex-col gap-1"
                        style={{ borderBottom: i < 2 ? `1px solid var(--cream-dark)` : 'none', borderRight: i % 2 === 0 ? `1px solid var(--cream-dark)` : 'none' }}
                      >
                        <span className="font-display font-bold text-2xl" style={{ color: 'var(--forest)' }}>{stat.value}</span>
                        <span className="text-xs" style={{ color: 'var(--text-soft)' }}>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl p-5 border" style={{ background: 'var(--amber-light)', borderColor: '#E8C870' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--amber-dark)' }}>What we promise</p>
                  <ul className="space-y-2">
                    {[
                      'All chicks vaccinated before sale',
                      'Same-day callback after booking',
                      'Transparent, no-surprise pricing',
                      'Pickup from Makina or arranged delivery',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-dark)' }}>
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--amber-dark)' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="py-16 px-4" style={{ background: 'var(--forest-light)' }}>
          <div className="container-base max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="eyebrow mb-3">What we stand for</p>
              <h2 className="font-display text-3xl font-bold" style={{ color: 'var(--text-dark)' }}>
                Simple principles, kept every day.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {VALUES.map((v) => (
                <div key={v.title} className="bg-white rounded-2xl p-7 shadow-sm border text-center" style={{ borderColor: 'var(--cream-dark)' }}>
                  <div className="text-4xl mb-4">{v.emoji}</div>
                  <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-dark)' }}>{v.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="py-16 px-4" style={{ background: '#fff' }}>
          <div className="container-base max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="eyebrow mb-3">Get in Touch</p>
              <h2 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--text-dark)' }}>
                We&apos;re right here in Kibera.
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
                Questions, bulk orders, or just want to visit the farm? We would love to hear from you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {[
                { icon: <MapPin className="w-5 h-5" style={{ color: 'var(--forest)' }} />, label: 'Location', value: 'Makina, Kibera, Nairobi' },
                { icon: <Phone className="w-5 h-5" style={{ color: 'var(--forest)' }} />, label: 'Phone', value: '0182 193 380' },
                { icon: <Mail className="w-5 h-5" style={{ color: 'var(--forest)' }} />, label: 'Email', value: 'info@kwambokapoultry.co.ke' },
              ].map((c) => (
                <div key={c.label} className="flex flex-col items-center text-center rounded-2xl p-5 border" style={{ background: 'var(--forest-light)', borderColor: 'var(--cream-dark)' }}>
                  {c.icon}
                  <p className="text-xs mt-2" style={{ color: 'var(--text-soft)' }}>{c.label}</p>
                  <p className="font-semibold text-sm mt-0.5" style={{ color: 'var(--text-dark)' }}>{c.value}</p>
                </div>
              ))}
            </div>

            <ContactForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
