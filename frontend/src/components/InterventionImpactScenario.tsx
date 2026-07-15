import React, { useMemo, useState } from 'react';
import { CauseKey, CityMix } from './SourceMixComparator';
import { useOllamaText } from './useOllamaText';
import { OllamaCommentaryBody } from './OllamaCommentary';

type InterventionKey = 'ev' | 'kiln' | 'industry' | 'cropBan' | 'dust';
type PollutionTier = 'best' | 'medium' | 'worst';

// Two cities per tier so the scenario tool spans the full spectrum (cleanest to most polluted),
// not just five uniformly high-PM2.5 cities as before. Worst-tier rows reuse the same PM2.5 and
// cause-mix figures as Delhi/Lahore in SourceMixComparator's CITIES for consistency.
const SCENARIO_CITIES: (CityMix & { tier: PollutionTier })[] = [
  { id: 'zurich', name: 'Zurich', pm25: 8, tier: 'best', transport: 40, kilns: 0, industry: 20, crop: 5, other: 35 },
  { id: 'hobart', name: 'Hobart', pm25: 9, tier: 'best', transport: 35, kilns: 0, industry: 15, crop: 10, other: 40 },
  { id: 'mexicocity', name: 'Mexico City', pm25: 45, tier: 'medium', transport: 42, kilns: 5, industry: 25, crop: 8, other: 20 },
  { id: 'bangkok', name: 'Bangkok', pm25: 38, tier: 'medium', transport: 38, kilns: 4, industry: 22, crop: 18, other: 18 },
  { id: 'lahore', name: 'Lahore', pm25: 150, tier: 'worst', transport: 35, kilns: 17, industry: 28, crop: 8, other: 12 },
  { id: 'delhi', name: 'Delhi', pm25: 170, tier: 'worst', transport: 28, kilns: 12, industry: 14, crop: 34, other: 12 },
];

const TIER_COLORS: Record<PollutionTier, string> = {
  best: '#16a34a',
  medium: '#d97706',
  worst: '#dc2626',
};

const INTERVENTIONS: { key: InterventionKey; label: string; cause: CauseKey; effect: number }[] = [
  { key: 'ev', label: 'EV shift', cause: 'transport', effect: 0.6 },
  { key: 'kiln', label: 'Kiln retrofit', cause: 'kilns', effect: 0.7 },
  { key: 'industry', label: 'Industry regulation', cause: 'industry', effect: 0.5 },
  { key: 'cropBan', label: 'Crop-burn ban', cause: 'crop', effect: 0.9 },
  { key: 'dust', label: 'Construction dust control', cause: 'other', effect: 0.4 },
];

const WHO_GUIDELINE = 5;
const SCALE_MAX = 200;

const FALLBACK =
  "Each intervention chips away at a different source, but none of them alone closes the gap to the WHO guideline - only the full set gets close.";

function buildPrompt(city: CityMix, active: InterventionKey[], projected: number): string {
  const activeLabels = INTERVENTIONS.filter((i) => active.includes(i.key)).map((i) => i.label);
  const description = activeLabels.length
    ? `The reader has activated: ${activeLabels.join(', ')}.`
    : 'The reader has not activated any interventions yet.';

  return `You are an analyst writing plain, structural commentary for a data-journalism piece on South Asian air pollution. The reader is running a scenario for ${city.name}, current PM2.5 ${city.pm25} µg/m³. ${description} Under this scenario, projected PM2.5 is ${projected.toFixed(0)} µg/m³, against a WHO guideline of ${WHO_GUIDELINE} µg/m³.

Write 2 to 3 sentences of direct, structural analyst commentary on what this combination of interventions does and does not fix. No bullet points, no fluff, no headings. Return only the commentary text.`;
}

export const InterventionImpactScenario: React.FC = () => {
  const [cityId, setCityId] = useState(SCENARIO_CITIES[2].id);
  const [active, setActive] = useState<InterventionKey[]>([]);
  const [interacted, setInteracted] = useState(false);

  const city = useMemo(() => SCENARIO_CITIES.find((c) => c.id === cityId) || SCENARIO_CITIES[0], [cityId]);

  const projected = useMemo(() => {
    let value = city.pm25;
    INTERVENTIONS.forEach((intervention) => {
      if (active.includes(intervention.key)) {
        const causeAbs = (city[intervention.cause] / 100) * city.pm25;
        value -= causeAbs * intervention.effect;
      }
    });
    return Math.max(0, value);
  }, [city, active]);

  const prompt = interacted ? buildPrompt(city, active, projected) : null;
  const { text, status } = useOllamaText(prompt, FALLBACK);

  const toggle = (key: InterventionKey) => {
    setInteracted(true);
    setActive((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
  };

  const selectCity = (id: string) => {
    setInteracted(true);
    setCityId(id);
  };

  const currentPct = Math.min(100, (city.pm25 / SCALE_MAX) * 100);
  const projectedPct = Math.min(100, (projected / SCALE_MAX) * 100);
  const whoPct = (WHO_GUIDELINE / SCALE_MAX) * 100;

  return (
    <div className="mx-auto w-full max-w-[61rem] px-6 md:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Intervention scenario</p>
      <h4 className="mt-2 text-2xl font-extrabold md:text-3xl" style={{ color: '#1e3a5f' }}>
        How far can policy actually move the number?
      </h4>
      <p className="mt-2 text-base leading-relaxed text-slate-600">
        Toggle interventions for one city and watch the projected PM2.5 move against the WHO guideline.
        Cities span the full range - two of the cleanest, two mid-range, and two of the most polluted.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {SCENARIO_CITIES.map((c) => {
          const on = c.id === cityId;
          const tierColor = TIER_COLORS[c.tier];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCity(c.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                on ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-blue-200 bg-white text-slate-600 hover:border-indigo-300'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tierColor }} />
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {INTERVENTIONS.map((intervention) => {
          const on = active.includes(intervention.key);
          return (
            <button
              key={intervention.key}
              type="button"
              onClick={() => toggle(intervention.key)}
              className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-colors ${
                on ? 'border-indigo-300 bg-indigo-50' : 'border-blue-100 bg-white'
              }`}
            >
              <span className="text-sm font-semibold text-slate-700">{intervention.label}</span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: on ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-500">Projected PM2.5</span>
          <span className="text-3xl font-extrabold transition-all duration-700" style={{ color: '#1e3a5f' }}>
            {projected.toFixed(0)} <span className="text-base font-semibold text-slate-500">µg/m³</span>
          </span>
        </div>
        <div className="relative mt-3 h-4 w-full overflow-hidden rounded-full bg-blue-50">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
            style={{ width: `${projectedPct}%` }}
          />
          <div className="absolute inset-y-0 border-l-2 border-dashed border-slate-400" style={{ left: `${whoPct}%` }} />
        </div>
        <div className="relative mt-1 h-8 text-xs text-slate-500">
          <span className="absolute -translate-x-1/2" style={{ left: `${whoPct}%` }}>
            WHO guideline: {WHO_GUIDELINE}
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: `${currentPct}%` }}>
            Current: {city.pm25}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 border border-emerald-200">
          Generated by Ollama
        </span>
      </div>

      <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
        <h6 className="text-base font-bold" style={{ color: '#1e3a5f' }}>
          Analyst read
        </h6>
        <div className="mt-2">
          {!interacted && <p className="text-base leading-relaxed text-slate-500">Toggle an intervention above to generate commentary.</p>}
          {interacted && <OllamaCommentaryBody status={status} text={text} />}
        </div>
      </div>
    </div>
  );
};
