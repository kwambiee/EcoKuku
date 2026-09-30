'use client';

import { useState } from 'react';

type Stage = {
  period: string;
  title: string;
  desc: string;
  checkpoints: string[];
  icon: string;
};

type Breed = {
  key: string;
  label: string;
  emoji: string;
  duration: string;
  purpose: string;
  stages: Stage[];
};

const TIMELINES: Breed[] = [
  {
    key: 'BROILER',
    label: 'Broiler',
    emoji: '🐔',
    duration: '8–10 weeks',
    purpose: 'Meat production',
    stages: [
      {
        period: 'Day 1',
        title: 'Arrival & Brooding',
        desc: 'Day-old chicks arrive from our hatchery or a trusted supplier. They go straight into the brooder — a warm, clean pen heated to 35°C. This first week is the most critical for survival.',
        checkpoints: ['Temperature checked every 4 hours', 'Electrolytes given in water', 'Marek\'s disease vaccine on day 1'],
        icon: '🥚',
      },
      {
        period: 'Week 1–3',
        title: 'Starter Phase',
        desc: 'Chicks stay in the brooder eating high-protein starter crumbles (20–22% protein). Temperature is reduced gradually by 2–3°C each week as they develop their own heat regulation.',
        checkpoints: ['Newcastle disease vaccine (week 1)', 'Daily headcount and mortality check', 'Bedding turned or replaced regularly'],
        icon: '🐣',
      },
      {
        period: 'Week 4–7',
        title: 'Grower Phase',
        desc: 'Moved to the larger growing pen. Feed switches to grower pellets. Birds develop rapidly, gaining 50–100 g per day. Space per bird is expanded to prevent stress.',
        checkpoints: ['Gumboro vaccine (week 4)', 'Space per bird expanded', 'Water nipples checked and upgraded'],
        icon: '🐤',
      },
      {
        period: 'Week 8–10',
        title: 'Ready for Collection',
        desc: 'Broilers hit market weight of 2.0–2.5 kg. We contact buyers to arrange collection from Makina or delivery to your location within Nairobi.',
        checkpoints: ['Live weight checked before sale', 'Buyer notified for collection or delivery', 'Any unsold birds held safely'],
        icon: '🐓',
      },
    ],
  },
  {
    key: 'KIENYEJI',
    label: 'Kienyeji',
    emoji: '🐓',
    duration: '16–24 weeks',
    purpose: 'Dual-purpose (meat + eggs)',
    stages: [
      {
        period: 'Day 1',
        title: 'Indigenous Chick Arrival',
        desc: 'Pure Kienyeji chicks sourced from indigenous breeds — smaller than broilers, but carrying the genetics of Kenya\'s most prized local chicken. Their slower growth is exactly what makes the meat flavourful.',
        checkpoints: ['Vitamin supplement in first water', 'Lower brooder temperature than broilers', 'Marek\'s & Newcastle vaccines on arrival'],
        icon: '🥚',
      },
      {
        period: 'Week 1–6',
        title: 'Brooding & Early Growth',
        desc: 'Kienyeji chicks need more weeks in the brooder than broilers but less heating. They grow steadily on mixed grain and chick mash. We give them access to an exercise yard from week 3.',
        checkpoints: ['Weekly headcount and weight spot-checks', 'Mixed grain and chick mash diet', 'Supervised outdoor access from week 3'],
        icon: '🐣',
      },
      {
        period: 'Week 7–16',
        title: 'Free-Range Growing',
        desc: 'Moved to larger open-air pens. Kienyeji thrive when they can scratch, forage, and move. We supplement their diet with grain and greens. Natural light and space is what develops their distinctive flavour.',
        checkpoints: ['Gumboro & Fowl Pox vaccines', 'Daily supervised outdoor access', 'Grain and green supplement'],
        icon: '🐤',
      },
      {
        period: 'Week 17–24',
        title: 'Ready — Meat or Eggs',
        desc: 'Kienyeji roosters are marketable for meat from week 16. Hens reach point-of-lay by week 20–24. The slow natural growth produces deep flavour and rich yolk colour that fast-grown birds cannot match.',
        checkpoints: ['Sexing and sorting if required', 'Females held for laying if needed', 'Males ready for market at week 16+'],
        icon: '🐓',
      },
    ],
  },
  {
    key: 'LAYER',
    label: 'Layer',
    emoji: '🥚',
    duration: '20 weeks to first egg',
    purpose: '250–300 eggs per year',
    stages: [
      {
        period: 'Day 1',
        title: 'Day-Old Layer Chick',
        desc: 'Layer chicks (ISA Brown or Lohmann hybrids) arrive from the hatchery. The first 72 hours are critical — temperature, electrolytes, and vaccination all happen in this window.',
        checkpoints: ['Electrolytes given immediately', 'Brooder held at 35°C', 'All vaccinations logged from day 1'],
        icon: '🥚',
      },
      {
        period: 'Week 1–6',
        title: 'Chick Starter Phase',
        desc: 'High-protein (22%) chick starter feed. Layer chicks are fed on a more precise schedule than broilers because early nutrition directly shapes lifetime egg production.',
        checkpoints: ['Newcastle vaccine week 1 & 4', 'Marek\'s on arrival', 'Gumboro week 3'],
        icon: '🐣',
      },
      {
        period: 'Week 7–16',
        title: 'Pullet Phase',
        desc: 'Switched to grower feed (17% protein). Body weight and condition are monitored weekly. This is the key hormonal development phase — get it wrong here and laying onset is delayed.',
        checkpoints: ['Weight monitored weekly', 'Lighting programme begins at week 10', 'De-worming at week 12'],
        icon: '🐤',
      },
      {
        period: 'Week 17–20',
        title: 'Point of Lay',
        desc: 'Pre-lay pellets introduced (calcium boosted for strong shells). Nesting boxes installed. Hens show signs of laying — combs redden and brighten. First egg typically appears between week 18 and 22.',
        checkpoints: ['Pre-lay pellets from week 17', 'Nesting boxes: 1 per 5 hens', 'First egg recorded and dated'],
        icon: '🏡',
      },
      {
        period: 'Week 20+',
        title: 'Full Production',
        desc: 'Peak production at week 28–36. A healthy ISA Brown lays 300+ eggs in year one. Eggs are collected twice daily and are available fresh at the farm gate.',
        checkpoints: ['Eggs collected morning and evening', 'Layer mash with 18% protein', 'Calcium supplement in drinking water'],
        icon: '🥚',
      },
    ],
  },
];

export default function JourneyTimeline() {
  const [active, setActive] = useState(0);
  const breed = TIMELINES[active];

  return (
    <div>
      {/* Breed tabs */}
      <div className="flex gap-2 flex-wrap mb-10">
        {TIMELINES.map((b, i) => (
          <button
            key={b.key}
            onClick={() => setActive(i)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border"
            style={
              i === active
                ? { background: 'var(--forest)', color: '#fff', borderColor: 'var(--forest)' }
                : { background: '#fff', color: 'var(--text-mid)', borderColor: 'var(--cream-dark)' }
            }
          >
            <span>{b.emoji}</span>
            {b.label}
          </button>
        ))}
      </div>

      {/* Breed meta */}
      <div className="flex flex-wrap gap-6 mb-10 p-5 rounded-2xl border" style={{ background: 'var(--forest-light)', borderColor: 'var(--cream-dark)' }}>
        <div>
          <p className="text-xs uppercase tracking-wider font-bold mb-1" style={{ color: 'var(--text-soft)' }}>Total Time</p>
          <p className="font-semibold" style={{ color: 'var(--text-dark)' }}>{breed.duration}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider font-bold mb-1" style={{ color: 'var(--text-soft)' }}>Purpose</p>
          <p className="font-semibold" style={{ color: 'var(--text-dark)' }}>{breed.purpose}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider font-bold mb-1" style={{ color: 'var(--text-soft)' }}>Breed Type</p>
          <p className="font-semibold" style={{ color: 'var(--text-dark)' }}>{breed.label}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-5 top-6 bottom-6 w-0.5 hidden sm:block"
          style={{ background: 'var(--cream-dark)' }}
        />

        <div className="space-y-0">
          {breed.stages.map((stage, idx) => (
            <div key={idx} className="flex gap-5 sm:gap-8 relative">
              {/* Timeline node */}
              <div className="flex flex-col items-center flex-shrink-0 relative z-10">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 bg-white"
                  style={{ borderColor: 'var(--forest)' }}
                >
                  {stage.icon}
                </div>
              </div>

              {/* Content card */}
              <div className="flex-1 pb-10">
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--cream-dark)' }}>
                  <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'var(--cream)', borderColor: 'var(--cream-dark)' }}>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--amber)' }}>{stage.period}</span>
                      <h3 className="font-bold text-base mt-0.5" style={{ color: 'var(--text-dark)' }}>{stage.title}</h3>
                    </div>
                  </div>
                  <div className="p-6 bg-white">
                    <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-mid)' }}>{stage.desc}</p>
                    <div className="space-y-1.5">
                      {stage.checkpoints.map((cp) => (
                        <div key={cp} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-soft)' }}>
                          <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--forest)' }} />
                          {cp}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* End CTA */}
      <div className="mt-2 rounded-2xl p-6 text-center" style={{ background: 'var(--forest)' }}>
        <p className="text-white font-bold text-lg mb-1">Ready to order {breed.label} chicks?</p>
        <p className="text-white/60 text-sm mb-4">Submit a booking request and we call you back to confirm.</p>
        <a href="/#book" className="btn-amber px-8 py-3 inline-block">
          Book {breed.label} Chicks →
        </a>
      </div>
    </div>
  );
}
