import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckCircle2 } from 'lucide-react';

export default function JourneyPage() {
  const stages = [
    {
      number: 1,
      title: 'Incubation',
      description: 'Our eggs are carefully incubated at optimal temperature and humidity for 21 days. Each egg is monitored for viability.',
      icon: '🥚',
    },
    {
      number: 2,
      title: 'Hatching',
      description: 'Chicks hatch naturally without human interference. Healthy chicks are separated and moved to brooding pens.',
      icon: '🐣',
    },
    {
      number: 3,
      title: 'Growth Stage',
      description: 'Chicks are raised in controlled environments with proper lighting and temperature. They grow rapidly over 4-6 weeks.',
      icon: '🐤',
    },
    {
      number: 4,
      title: 'Organic Feeding',
      description: 'We provide organic, antibiotic-free feed with essential nutrients. No artificial growth stimulants or hormones.',
      icon: '🌽',
    },
    {
      number: 5,
      title: 'Health Care',
      description: 'Regular health checks, vaccinations, and disease prevention. Veterinary oversight ensures bird wellbeing.',
      icon: '💉',
    },
    {
      number: 6,
      title: 'Ready for Market',
      description: 'At 6-8 weeks (broilers) or 16-18 weeks (layers), birds are ready. Farm-fresh to your table in 2 hours.',
      icon: '🐔',
    },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="bg-green-900 text-white py-12 text-center">
          <div className="container-base">
            <div className="text-sm font-medium text-green-200 mb-3">FARM TRANSPARENCY</div>
            <h1 className="text-4xl font-bold mb-3">How We Raise Your Birds</h1>
            <p className="text-green-100 max-w-2xl mx-auto">From egg to your table — every step, no secrets. This is what happens on the farm before your order arrives.</p>
          </div>
        </div>

        <section className="py-12 md:py-16">
          <div className="container-base max-w-2xl">
            <div className="space-y-8">
              {stages.map((stage, idx) => (
                <div key={stage.number} className="flex gap-6">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-600 flex items-center justify-center text-2xl font-bold text-green-900 flex-shrink-0">
                      {stage.number}
                    </div>
                    {idx < stages.length - 1 && (
                      <div className="w-0.5 bg-green-100 my-2 flex-1" style={{ minHeight: '80px' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pt-2 pb-4">
                    <h3 className="text-2xl font-bold mb-2">{stage.title}</h3>
                    <p className="text-gray-600 mb-3 text-lg">{stage.description}</p>
                    <div className="text-5xl">{stage.icon}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-green-50 py-12 border-t border-green-100">
          <div className="container-base">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Commitment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                'No antibiotics or growth hormones',
                'Free-range, open-air pens',
                'Daily health monitoring',
                '100% organic, natural feed',
                'Optimal hygiene standards',
                'Fresh, same-day delivery',
              ].map((commitment) => (
                <div key={commitment} className="flex gap-3 items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-700 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{commitment}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
