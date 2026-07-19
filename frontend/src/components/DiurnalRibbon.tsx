import React, { useEffect, useState } from 'react';
import { storyAPI } from '../services/api';
import { AGENTIC_TIER_LABELS, AgenticCityTier } from '../data/agenticMechanismData';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';
const ACCENT = '#0284c7';

// Heavy at dawn, easing by mid-afternoon, thickening again at night - extracted from the
// retired TodaysAirInWords.tsx, which paired this ribbon with a per-city sentence that's now
// redundant with the closing personalization beat.
const HOUR_INTENSITY = [
  0.55, 0.6, 0.65, 0.72, 0.8, 0.9, 0.95, 0.85, 0.7, 0.55, 0.42, 0.32,
  0.25, 0.2, 0.17, 0.15, 0.18, 0.25, 0.35, 0.48, 0.6, 0.72, 0.82, 0.7,
];
const LIGHTEST_HOUR = HOUR_INTENSITY.indexOf(Math.min(...HOUR_INTENSITY));
const HEAVIEST_HOUR = HOUR_INTENSITY.indexOf(Math.max(...HOUR_INTENSITY));
const RAW_MIN = Math.min(...HOUR_INTENSITY);
const RAW_MAX = Math.max(...HOUR_INTENSITY);

// Same daily rhythm (shape/timing never changes), but rescaled into a tier-specific band so the
// ribbon's overall color reads as worse/better air, not just a fixed gradient regardless of tier.
const TIER_INTENSITY_RANGE: Record<AgenticCityTier, [number, number]> = {
  worst: [0.55, 1],
  medium: [0.3, 0.75],
  best: [0.05, 0.45],
};

function tierIntensity(tier: AgenticCityTier, hour: number) {
  const [lo, hi] = TIER_INTENSITY_RANGE[tier];
  const norm = (HOUR_INTENSITY[hour] - RAW_MIN) / (RAW_MAX - RAW_MIN);
  return lo + norm * (hi - lo);
}

const SAGE = [126, 150, 104];
const AMBER = [176, 132, 72];
const TERRACOTTA = [129, 67, 47];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function ribbonColor(intensity: number) {
  const from = intensity < 0.5 ? SAGE : AMBER;
  const to = intensity < 0.5 ? AMBER : TERRACOTTA;
  const t = intensity < 0.5 ? intensity / 0.5 : (intensity - 0.5) / 0.5;
  const [r, g, b] = [
    Math.round(lerp(from[0], to[0], t)),
    Math.round(lerp(from[1], to[1], t)),
    Math.round(lerp(from[2], to[2], t)),
  ];
  return `rgb(${r},${g},${b})`;
}

type DayRibbonLabels = { easiest: string; heaviest: string; summary: string };

const TIER_ORDER: AgenticCityTier[] = ['worst', 'medium', 'best'];

// Mirrors AGENTIC_DAY_RIBBON_CONTEXT in backend/app/routes/story_routes.py, but generalized to
// the tier rather than a specific city, since the summary no longer names a city.
const TIER_CONTEXT: Record<AgenticCityTier, string> = {
  worst: 'generally very poor, among the most polluted air in the world',
  medium: 'moderate - historically improved but still often elevated',
  best: 'generally clean and consistently within healthy guidelines',
};

function fallbackSummary(tier: AgenticCityTier) {
  return `Air quality here is ${TIER_CONTEXT[tier]}, and it still follows the same daily shape most cities do - thickest at dawn, clearest by mid-afternoon, then building again after dark.`;
}

export const DiurnalRibbon: React.FC = () => {
  const [activeTier, setActiveTier] = useState<AgenticCityTier>('worst');
  const [labelsByTier, setLabelsByTier] = useState<Record<AgenticCityTier, DayRibbonLabels | null>>({
    worst: null,
    medium: null,
    best: null,
  });

  const labels = labelsByTier[activeTier];

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      TIER_ORDER.map(async (tier) => {
        try {
          const res = await storyAPI.agenticDayRibbon({ tier });
          if (res.data?.success && res.data?.data) {
            return [
              tier,
              {
                easiest: res.data.data.easiest,
                heaviest: res.data.data.heaviest,
                summary: res.data.data.summary,
              } as DayRibbonLabels,
            ] as const;
          }
        } catch {
          // Falls through to tier fallback below.
        }
        return [
          tier,
          {
            easiest: 'easiest in the afternoon',
            heaviest: 'heaviest at dawn',
            summary: fallbackSummary(tier),
          } as DayRibbonLabels,
        ] as const;
      })
    ).then((results) => {
      if (cancelled) return;
      setLabelsByTier({
        worst: results.find(([tier]) => tier === 'worst')?.[1] ?? null,
        medium: results.find(([tier]) => tier === 'medium')?.[1] ?? null,
        best: results.find(([tier]) => tier === 'best')?.[1] ?? null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto mt-12 w-full max-w-[144rem] text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#0C447C' }}>
        Daily pattern
      </p>
      <h3 className="mt-3 text-center text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">
        How AQI <span style={{ color: '#00A5CF' }}>Changes</span> Over The Day
      </h3>
      <p className="mx-auto mt-4 max-w-4xl text-base leading-relaxed" style={{ color: MUTED }}>
        {labels?.summary ?? fallbackSummary(activeTier)}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        {TIER_ORDER.map((tier) => {
          const active = activeTier === tier;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setActiveTier(tier)}
              style={{
                color: active ? '#fff' : TEXT,
                background: active ? ACCENT : '#fff',
                border: `1.5px solid ${active ? ACCENT : 'var(--ss-border)'}`,
                borderRadius: '999px',
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: active ? 700 : 600,
                boxShadow: active ? '0 4px 14px rgba(2,132,199,0.28)' : '0 1px 2px rgba(0,0,0,0.03)',
              }}
              className="text-base transition-all duration-200 hover:-translate-y-0.5 sm:text-lg"
            >
              {AGENTIC_TIER_LABELS[tier]}
            </button>
          );
        })}
      </div>

      <div className="relative mt-6 w-full">
        <div className="flex" style={{ height: '48px', borderRadius: '16px', overflow: 'hidden' }}>
          {HOUR_INTENSITY.map((_, hour) => (
            <div key={hour} style={{ flex: 1, backgroundColor: ribbonColor(tierIntensity(activeTier, hour)) }} />
          ))}
        </div>
        <div className="relative mt-2 h-6 text-sm" style={{ color: MUTED }}>
          <span className="absolute -translate-x-1/2" style={{ left: `${((LIGHTEST_HOUR + 0.5) / 24) * 100}%` }}>
            {labels?.easiest ?? ' '}
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: `${((HEAVIEST_HOUR + 0.5) / 24) * 100}%`, color: ACCENT }}>
            {labels?.heaviest ?? ' '}
          </span>
        </div>
      </div>
    </section>
  );
};
