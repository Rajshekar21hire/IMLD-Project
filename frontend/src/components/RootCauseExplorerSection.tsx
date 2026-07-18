import React, { useMemo, useState } from 'react';
import { Car, Flame, Factory, Wind, CloudFog, Building2, Scale, type LucideIcon } from 'lucide-react';

type CityId = 'lahore' | 'delhi' | 'newdelhi' | 'dhaka' | 'ghaziabad';

type RootCause = {
  key: string;
  name: string;
  percentage?: string;
  qualitative?: string;
  description: string;
};

type CityRootCauseData = {
  id: CityId;
  name: string;
  country: string;
  pm25: number;
  causes: RootCause[];
};

type CityTheme = {
  solid: string;
  soft: string;
  softer: string;
  border: string;
};

export type CauseIconKey = 'transport' | 'kilns' | 'industry' | 'crop' | 'geography' | 'sprawl' | 'governance';

export const causeIconByKey: Record<CauseIconKey, LucideIcon> = {
  transport: Car,
  kilns: Flame,
  industry: Factory,
  crop: Wind,
  geography: CloudFog,
  sprawl: Building2,
  governance: Scale,
};

const causeLabelToKey: Record<string, CauseIconKey> = {
  'Transport & vehicles': 'transport',
  'Brick kilns': 'kilns',
  'Industry & power': 'industry',
  'Crop burning': 'crop',
  'Geography & meteorology': 'geography',
  'Urban sprawl & construction': 'sprawl',
  'Governance gap': 'governance',
};

export const resolveCauseIcon = (causeLabelOrKey: string): LucideIcon => {
  const normalized = causeLabelOrKey.trim();
  const key = (causeLabelToKey[normalized] || normalized) as CauseIconKey;
  return causeIconByKey[key] || Scale;
};

const CITIES: CityRootCauseData[] = [
  {
    id: 'lahore',
    name: 'Lahore',
    country: 'Pakistan',
    pm25: 150,
    causes: [
      {
        key: 'transport',
        name: 'Transport',
        percentage: '35%',
        description: '6.3M registered vehicles, mostly old diesel on low-grade Euro II fuel.',
      },
      {
        key: 'kilns',
        name: 'Brick kilns',
        percentage: '17%',
        description: 'Thousands of coal-burning brick kilns across Punjab, many illegal or unregulated.',
      },
      {
        key: 'industry',
        name: 'Industry & power',
        percentage: '28%',
        description: 'Steel, foundry and textile factories burning coal or furnace oil, largely unregulated.',
      },
      {
        key: 'crop',
        name: 'Crop burning',
        qualitative: 'Seasonal spike',
        description: 'Punjab stubble burning worsens sharply October to November.',
      },
      {
        key: 'geography',
        name: 'Geography & meteorology',
        qualitative: 'Structural driver',
        description: 'Flat Punjab plain; winter inversions trap pollutants with no dispersion.',
      },
      {
        key: 'sprawl',
        name: 'Urban sprawl & construction',
        qualitative: 'Contributing',
        description: 'Unregulated construction over green and agricultural land, loss of tree cover.',
      },
      {
        key: 'governance',
        name: 'Governance gap',
        qualitative: 'Structural driver',
        description: 'Poor enforcement; policy exists but isn\'t implemented.',
      },
    ],
  },
  {
    id: 'delhi',
    name: 'Delhi',
    country: 'India',
    pm25: 170,
    causes: [
      {
        key: 'transport',
        name: 'Transport',
        percentage: '17-39%',
        description: 'Largest single source; 2- and 3-wheelers dominate at roughly 50% of transport share.',
      },
      {
        key: 'kilns',
        name: 'Brick kilns',
        qualitative: 'Major contributor',
        description: 'Kilns in the NCR periphery burn coal and agricultural waste.',
      },
      {
        key: 'industry',
        name: 'Industry & power',
        percentage: '14%',
        description: 'Regional power and industry; closed Badarpur plant alone drove 80-90% of power-sector particulates.',
      },
      {
        key: 'crop',
        name: 'Crop burning',
        percentage: '30-40%',
        description: 'Paddy stubble burning in Haryana and Punjab drives winter PM2.5 spikes.',
      },
      {
        key: 'geography',
        name: 'Geography & meteorology',
        qualitative: 'Structural driver',
        description: 'Landlocked, surrounded by states; winter fog plus low wind causes accumulation.',
      },
      {
        key: 'sprawl',
        name: 'Urban sprawl & construction',
        qualitative: 'Major contributor',
        description: 'Rapid unplanned urbanisation; construction dust among top sources.',
      },
      {
        key: 'governance',
        name: 'Governance gap',
        qualitative: 'Structural driver',
        description: 'Multiple overlapping jurisdictions in Delhi, UP, and Haryana, with no single authority.',
      },
    ],
  },
  {
    id: 'newdelhi',
    name: 'New Delhi',
    country: 'India (NCR)',
    pm25: 165,
    causes: [
      {
        key: 'transport',
        name: 'Transport',
        qualitative: 'Shared network',
        description: 'Same NCR transport network as Delhi; shared airshed compounds exposure.',
      },
      {
        key: 'kilns',
        name: 'Brick kilns',
        qualitative: 'Shared kiln belt',
        description: 'Part of the shared NCR kiln belt; UP and Haryana kilns affect the airshed.',
      },
      {
        key: 'industry',
        name: 'Industry & power',
        qualitative: 'Major contributor',
        description: 'Industrial estates across the NCR contribute shared regional emissions.',
      },
      {
        key: 'crop',
        name: 'Crop burning',
        qualitative: 'Seasonal, transboundary',
        description: 'Same seasonal biomass spike as Delhi, transboundary from UP fields.',
      },
      {
        key: 'geography',
        name: 'Geography & meteorology',
        qualitative: 'Structural driver',
        description: 'Same bowl geography as Delhi, no natural ventilation corridor.',
      },
      {
        key: 'sprawl',
        name: 'Urban sprawl & construction',
        percentage: '35-66% (PM10)',
        description: 'Construction boom across the NCR; road dust a large share of PM10.',
      },
      {
        key: 'governance',
        name: 'Governance gap',
        qualitative: 'Structural driver',
        description: 'Same multi-state governance gap as Delhi.',
      },
    ],
  },
  {
    id: 'dhaka',
    name: 'Dhaka',
    country: 'Bangladesh',
    pm25: 130,
    causes: [
      {
        key: 'transport',
        name: 'Transport',
        percentage: '15%',
        description: 'Up to 15% of PM2.5; 6.17 lakh unfit vehicles running expired fitness certificates.',
      },
      {
        key: 'kilns',
        name: 'Brick kilns',
        percentage: '13-29%',
        description: '2,000+ kilns surround the city, historically the #1 source.',
      },
      {
        key: 'industry',
        name: 'Industry & power',
        percentage: '28%',
        description: 'Factories discharge without filtration; household fuel combustion adds 28%.',
      },
      {
        key: 'crop',
        name: 'Crop burning',
        percentage: '10%',
        description: 'Transboundary sources; regional agricultural burning drifts in.',
      },
      {
        key: 'geography',
        name: 'Geography & meteorology',
        qualitative: 'Structural driver',
        description: 'River delta city; dense fog and low winter wind trap particulates.',
      },
      {
        key: 'sprawl',
        name: 'Urban sprawl & construction',
        percentage: '30%',
        description: 'Construction and road works account for 30% of pollution in the fastest-growing urban area.',
      },
      {
        key: 'governance',
        name: 'Governance gap',
        qualitative: 'Structural driver',
        description: '75% of closed kilns resume operations; only 10% of eco-brick target met.',
      },
    ],
  },
  {
    id: 'ghaziabad',
    name: 'Ghaziabad',
    country: 'India (NCR)',
    pm25: 158,
    causes: [
      {
        key: 'transport',
        name: 'Transport',
        qualitative: 'Dense corridor',
        description: 'Dense truck and heavy-vehicle corridor on NH-9, plus an industrial transport hub.',
      },
      {
        key: 'kilns',
        name: 'Brick kilns',
        qualitative: 'Major cluster',
        description: 'Major kiln clusters within Ghaziabad district, part of the Delhi NCR kiln belt.',
      },
      {
        key: 'industry',
        name: 'Industry & power',
        qualitative: 'Heavy industrial base',
        description: 'Plastics, metals and chemicals in one of UP\'s most industrialised districts.',
      },
      {
        key: 'crop',
        name: 'Crop burning',
        qualitative: 'Major seasonal driver',
        description: 'Surrounded by agricultural land in western UP; crop-fire smoke a major driver.',
      },
      {
        key: 'geography',
        name: 'Geography & meteorology',
        qualitative: 'Structural driver',
        description: 'Downwind of Delhi, elevated from the Yamuna floodplain.',
      },
      {
        key: 'sprawl',
        name: 'Urban sprawl & construction',
        qualitative: 'Rapid, uncontrolled',
        description: 'Rapid high-rise construction with uncontrolled road dust and debris.',
      },
      {
        key: 'governance',
        name: 'Governance gap',
        qualitative: 'Regulatory grey zone',
        description: 'UP enforcement weaker than Delhi\'s; proximity to capital creates a grey zone.',
      },
    ],
  },
];

const parsePercentValue = (value: string): number | null => {
  const matches = value.match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const numbers = matches.map((entry) => Number.parseFloat(entry)).filter((entry) => !Number.isNaN(entry));
  if (numbers.length === 0) {
    return null;
  }

  return Math.max(...numbers);
};

const CITY_THEME_BY_ID: Record<CityId, CityTheme> = {
  lahore: {
    solid: '#173753',
    soft: 'rgba(23, 55, 83, 0.16)',
    softer: 'rgba(23, 55, 83, 0.1)',
    border: 'rgba(23, 55, 83, 0.34)',
  },
  delhi: {
    solid: '#6daedb',
    soft: 'rgba(109, 174, 219, 0.16)',
    softer: 'rgba(109, 174, 219, 0.1)',
    border: 'rgba(109, 174, 219, 0.34)',
  },
  newdelhi: {
    solid: '#2892d7',
    soft: 'rgba(40, 146, 215, 0.16)',
    softer: 'rgba(40, 146, 215, 0.1)',
    border: 'rgba(40, 146, 215, 0.34)',
  },
  dhaka: {
    solid: '#1b4353',
    soft: 'rgba(27, 67, 83, 0.16)',
    softer: 'rgba(27, 67, 83, 0.1)',
    border: 'rgba(27, 67, 83, 0.34)',
  },
  ghaziabad: {
    solid: '#1d70a2',
    soft: 'rgba(29, 112, 162, 0.16)',
    softer: 'rgba(29, 112, 162, 0.1)',
    border: 'rgba(29, 112, 162, 0.34)',
  },
};

export const RootCauseExplorerSection: React.FC = () => {
  const [selectedCityId, setSelectedCityId] = useState<CityId>('lahore');

  const selectedCity = useMemo(
    () => CITIES.find((city) => city.id === selectedCityId) ?? CITIES[0],
    [selectedCityId]
  );

  const ringPercent = Math.min(100, selectedCity.pm25 / 2);
  const circleRadius = 74;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (ringPercent / 100) * circumference;
  const theme = CITY_THEME_BY_ID[selectedCity.id];

  return (
    <section className="bg-white py-16 px-6 md:px-12">
      <div className="mx-auto max-w-[90rem]">
        <div className="space-y-5">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] font-bold text-[#0C447C]">Root-cause explorer</p>
             <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl"> Pick a <span style={{ color: '#00a5cf' }}> City. </span> See What&apos;s Actually In Its Air.</h2>
              <p className="mt-5 w-full text-center text-base leading-relaxed text-slate-700">
              Each city shares the same seven root causes, but the mix and severity are different everywhere. Select a city to break down its air quality index and what&apos;s driving it.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {CITIES.map((city) => {
              const active = city.id === selectedCityId;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => setSelectedCityId(city.id)}
                  className={active
                    ? 'rounded-full px-8 py-4 text-base font-bold shadow-sm transition-all duration-300 md:text-lg'
                    : 'rounded-full border px-8 py-4 text-base font-bold transition-all duration-300 md:text-lg'
                  }
                  style={
                    active
                      ? {
                          backgroundColor: CITY_THEME_BY_ID[city.id].solid,
                          borderColor: CITY_THEME_BY_ID[city.id].solid,
                          color: '#ffffff',
                          boxShadow: '0 6px 14px rgba(15, 23, 42, 0.18)',
                        }
                      : {
                          backgroundColor: CITY_THEME_BY_ID[city.id].solid,
                          borderColor: CITY_THEME_BY_ID[city.id].border,
                          color: '#ffffff',
                          opacity: 0.82,
                        }
                  }
                >
                  {city.name}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <article className="rounded-2xl border bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: theme.border }}>
              <h3 className="text-2xl font-black text-slate-950">{selectedCity.name}</h3>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-slate-500">{selectedCity.country}</p>

              <div className="mt-6 flex justify-center">
                <div className="relative h-44 w-44">
                  <svg className="h-44 w-44 -rotate-90" viewBox="0 0 180 180" aria-hidden="true">
                    <circle cx="90" cy="90" r={circleRadius} className="text-slate-100" stroke="currentColor" strokeWidth="12" fill="none" />
                    <circle
                      cx="90"
                      cy="90"
                      r={circleRadius}
                      className="transition-colors duration-300"
                      style={{ color: theme.solid }}
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl font-black text-slate-950">{selectedCity.pm25}</div>
                    <div className="text-xs text-slate-500">µg/m³ PM2.5</div>
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {selectedCity.causes.map((cause) => {
                const parsed = cause.percentage ? parsePercentValue(cause.percentage) : null;
                const barWidth = parsed !== null ? Math.min(100, parsed) : null;
                const CauseIcon = resolveCauseIcon(cause.key);

                return (
                  <article key={cause.key} className="rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: theme.border }}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300" style={{ backgroundColor: theme.softer }}>
                        <CauseIcon className="h-4 w-4 transition-colors duration-300" style={{ color: theme.solid }} />
                      </div>
                      <h4 className="text-base font-semibold text-slate-950">{cause.name}</h4>
                    </div>
                    {cause.percentage ? (
                      <div className="mt-3">
                        <div className="mb-1 text-xs font-semibold text-slate-700">{cause.percentage}</div>
                        <div className="h-1 rounded bg-slate-100">
                          <div className="h-1 rounded transition-[width,background-color] duration-300" style={{ width: `${barWidth ?? 0}%`, backgroundColor: theme.solid }} />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300" style={{ backgroundColor: theme.soft, color: theme.solid }}>
                        {cause.qualitative}
                      </div>
                    )}
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{cause.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
