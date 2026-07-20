import React, { useMemo, useState } from 'react';
import { useOllamaText } from './useOllamaText';
import { OllamaCommentaryBody } from './OllamaCommentary';

export type CauseKey = 'transport' | 'kilns' | 'industry' | 'crop' | 'other';

export type CityMix = { id: string; name: string; pm25: number } & Record<CauseKey, number>;

// Illustrative splits, grounded in the causes/emphasis already established for these five
// cities in RootCauseExplorerSection (same transport/kilns/industry/crop drivers), normalized
// to percentages of each city's own PM2.5 so every row sums to 100.
export const CITIES: CityMix[] = [
  { id: 'lahore', name: 'Lahore', pm25: 150, transport: 35, kilns: 17, industry: 28, crop: 8, other: 12 },
  { id: 'delhi', name: 'Delhi', pm25: 170, transport: 28, kilns: 12, industry: 14, crop: 34, other: 12 },
  { id: 'newdelhi', name: 'New Delhi', pm25: 165, transport: 26, kilns: 13, industry: 15, crop: 32, other: 14 },
  { id: 'dhaka', name: 'Dhaka', pm25: 130, transport: 15, kilns: 21, industry: 28, crop: 10, other: 26 },
  { id: 'ghaziabad', name: 'Ghaziabad', pm25: 158, transport: 24, kilns: 15, industry: 20, crop: 27, other: 14 },
];

// Softer, lower-saturation pastel tones - deliberately quieter than a typical categorical
// palette so the mix reads as calm proportions rather than an alarm-toned chart.
const SEGMENTS: { key: CauseKey; label: string; color: string }[] = [
  { key: 'transport', label: 'Transport', color: '#a8c8ec' },
  { key: 'kilns', label: 'Brick kilns', color: '#b7b3e8' },
  { key: 'industry', label: 'Industry & power', color: '#d3b6e3' },
  { key: 'crop', label: 'Crop burning', color: '#f0cf8e' },
  { key: 'other', label: 'Other', color: '#c9d1dc' },
];

const FALLBACK =
  'The five cities share the same short list of causes; what differs from one to the next is which cause carries the largest share, not which causes exist.';

function buildPrompt(city: CityMix): string {
  const breakdown = SEGMENTS.map((s) => `${s.label}: ${city[s.key]}%`).join(', ');
  return `You are an analyst writing plain, structural commentary for a data-journalism piece on South Asian air pollution. The reader just selected "${city.name}" (PM2.5 ${city.pm25} µg/m³) in a chart comparing five cities on the same five root causes of pollution: Transport, Brick kilns, Industry & power, Crop burning, and Other.

${city.name}'s breakdown: ${breakdown}.

Write 2 to 3 sentences of direct, structural analyst commentary explaining what this city's specific mix reveals, in the context that all five cities share the same causes in different proportions. No bullet points, no fluff, no headings. Return only the commentary text.`;
}

export const SourceMixComparator: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [hoveredKey, setHoveredKey] = useState<CauseKey | null>(null);
  const city = CITIES[index];

  const prompt = useMemo(() => buildPrompt(city), [city]);
  const { text, status } = useOllamaText(prompt, FALLBACK);

  const goTo = (next: number) => setIndex(((next % CITIES.length) + CITIES.length) % CITIES.length);

  return (
    <div className="s4h-root mx-auto w-full max-w-[170rem] px-6 md:px-10">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0C447C]">Pollution source profile</p>
        <h2
          className="mt-3 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Same <span style={{ color: '#00A5CF' }}>Ingredients,</span> Different <span style={{ color: '#FF6D00' }}>Proportions</span>
        </h2>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          <br />
          Scroll or tap through the five cities - the same five causes are always present, just in different proportions.
          <br />
        </p>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-white text-lg text-slate-500 transition-transform hover:scale-110"
          aria-label="Previous city"
        >
          ‹
        </button>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {CITIES.map((c, i) => {
            const active = i === index;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setIndex(i)}
                className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: active ? '#eef2ff' : 'rgba(255,255,255,0.7)',
                    color: active ? '#4338ca' : '#64748b',
                  border: `1.5px solid ${active ? '#c7d2fe' : '#e2e8f0'}`,
                }}
                aria-pressed={active}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-white text-lg text-slate-500 transition-transform hover:scale-110"
          aria-label="Next city"
        >
          ›
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={CITIES.length - 1}
        step={1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        className="smc-slider mx-auto mt-4 block w-full max-w-md"
        aria-label="Scrub through cities"
      />

      <div key={city.id} className="smc-fade mt-6 rounded-2xl border border-indigo-100 bg-white/70 p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold" style={{ color: '#1e3a5f' }}>{city.name}</span>
          <span className="text-sm text-slate-500">{city.pm25} µg/m³ total PM2.5</span>
        </div>

        <div className="mt-4 flex h-10 w-full overflow-hidden rounded-full border border-slate-100">
          {SEGMENTS.map((seg) => {
            const share = city[seg.key];
            const dimmed = hoveredKey !== null && hoveredKey !== seg.key;
            return (
              <button
                key={seg.key}
                type="button"
                onMouseEnter={() => setHoveredKey(seg.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className="h-full transition-opacity"
                style={{ width: `${share}%`, backgroundColor: seg.color, opacity: dimmed ? 0.35 : 1 }}
                aria-label={`${seg.label}: ${share}% of ${city.name}'s PM2.5`}
              />
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {SEGMENTS.map((seg) => (
            <button
              key={seg.key}
              type="button"
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className="flex items-center gap-1.5 transition-opacity"
              style={{ opacity: hoveredKey !== null && hoveredKey !== seg.key ? 0.4 : 1 }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-slate-600">{seg.label}</span>
              <span className="font-semibold" style={{ color: '#1e3a5f' }}>{city[seg.key]}%</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
        <h6 className="text-base font-semibold leading-relaxed text-slate-700" style={{ color: '#1e3a5f', fontFamily: 'Inter, sans-serif' }}>
          For {city.name}
        </h6>
        <div className="mt-2">
          <OllamaCommentaryBody status={status} text={text} />
        </div>
      </div>

      <style>{`
        .smc-fade {
          animation: smc-fade-in 350ms ease-out;
        }
        @keyframes smc-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .smc-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 5px;
          border-radius: 9999px;
          background: rgba(148,163,184,0.3);
          outline: none;
        }
        .smc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #6366f1;
          box-shadow: 0 2px 8px rgba(15,36,55,0.2);
          cursor: pointer;
        }
        .smc-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border: none;
          border-radius: 9999px;
          background: #6366f1;
          box-shadow: 0 2px 8px rgba(15,36,55,0.2);
          cursor: pointer;
        }
        @media (prefers-reduced-motion: reduce) {
          .smc-fade { animation: none; }
        }
      `}</style>
    </div>
  );
};
