import React, { useEffect, useMemo, useState } from 'react';

type CityReadout = {
  city: string;
  value: number;
};

const CITY_READOUTS: CityReadout[] = [
  { city: 'Lahore', value: 150 },
  { city: 'Delhi', value: 170 },
  { city: 'New Delhi', value: 165 },
  { city: 'Dhaka', value: 130 },
  { city: 'Ghaziabad', value: 158 },
];

export const AirshedHeroSection: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const durationMs = 800;
    const start = performance.now();

    const step = (timestamp: number) => {
      const elapsed = timestamp - start;
      const next = Math.min(1, elapsed / durationMs);
      setProgress(next);

      if (next < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  const animatedReadouts = useMemo(
    () =>
      CITY_READOUTS.map((item) => {
        const animatedValue = Math.round(item.value * progress);
        const targetPercent = Math.min(100, item.value / 2);
        const animatedPercent = targetPercent * progress;

        return {
          ...item,
          animatedValue,
          animatedPercent,
        };
      }),
    [progress]
  );

  return (
    <section className="bg-white py-16 px-6 md:px-12">
      <div className="mx-auto max-w-[90rem] text-center">
       
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#0C447C] font-bold">
            Current Situation
          </p>

          <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">
            Five cities. One <span style={{ color: '#00A5CF' }}>Airshed.</span> A Shared Crisis.
          </h2>
          <br/>
          <p className="mt-5 w-full text-center text-base leading-relaxed text-slate-700">
            Lahore, Delhi, New Delhi, Dhaka and Ghaziabad top the world&apos;s worst
            air-quality rankings. Their pollution isn&apos;t five separate stories. It&apos;s
            one structural pattern of transport, kilns and industry, trapped by
            geography and let through by weak governance.
          </p>
          <br/>
          <div className="mt-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {animatedReadouts.map((item) => (
              <article
                key={item.city}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">{item.city}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-950 md:text-4xl">{item.animatedValue}</p>
                  <span className="text-xs text-slate-500">µg/m³ PM2.5</span>
                </div>
                <div className="mt-3 h-1 rounded bg-slate-100">
                  <div
                    className="h-1 rounded bg-sky-600"
                    style={{ width: `${item.animatedPercent}%` }}
                  />
                </div>
              </article>
            ))}
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">↓ Scroll to explore each city</p>
        
      </div>
    </section>
  );
};
