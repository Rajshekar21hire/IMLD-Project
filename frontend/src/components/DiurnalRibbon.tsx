import React, { useEffect, useState } from 'react';
import { storyAPI } from '../services/api';
import { AGENTIC_TIER_LABELS, AgenticCityTier } from '../data/agenticMechanismData';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';
const ACCENT = '#6fb8d3';
const ACCENT_DARK = '#3f8ca9';

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

const GREEN = [99, 153, 34];
const YELLOW_GREEN = [184, 213, 58];
const ORANGE = [239, 159, 39];
const RED_ORANGE = [216, 90, 48];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function ribbonColor(intensity: number) {
  let from: number[];
  let to: number[];
  let t: number;

  if (intensity < 0.33) {
    from = GREEN;
    to = YELLOW_GREEN;
    t = intensity / 0.33;
  } else if (intensity < 0.67) {
    from = YELLOW_GREEN;
    to = ORANGE;
    t = (intensity - 0.33) / 0.34;
  } else {
    from = ORANGE;
    to = RED_ORANGE;
    t = (intensity - 0.67) / 0.33;
  }

  const [r, g, b] = [
    Math.round(lerp(from[0], to[0], t)),
    Math.round(lerp(from[1], to[1], t)),
    Math.round(lerp(from[2], to[2], t)),
  ];
  return `rgb(${r},${g},${b})`;
}

type DayRibbonLabels = { easiest: string; heaviest: string; summary: string };

const TIER_ORDER: AgenticCityTier[] = ['worst', 'medium', 'best'];

const TIER_BUTTON_COLORS: Record<AgenticCityTier, string> = {
  worst: '#D85A30',
  medium: '#B8D53A',
  best: '#639922',
};

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
  const [hoveredTier, setHoveredTier] = useState<AgenticCityTier | null>(null);
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
    <section className="mx-auto w-full max-w-[84rem] text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#0C447C' }}>
        Daily pattern
      </p>
      <h3 className="mt-3 text-center text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">
        How AQI Changes Over <span style={{ color: '#792CA2' }}>The Day</span>
      </h3>
      <br />
      <p className="mx-auto max-w-4xl text-base leading-relaxed text-slate-700">
        {labels?.summary ?? fallbackSummary(activeTier)}
      </p>
      <br />

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
        {TIER_ORDER.map((tier) => {
          const active = activeTier === tier;
          const highlighted = active || hoveredTier === tier;
          const tierColor = TIER_BUTTON_COLORS[tier];
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setActiveTier(tier)}
              onMouseEnter={() => setHoveredTier(tier)}
              onMouseLeave={() => setHoveredTier(null)}
              onFocus={() => setHoveredTier(tier)}
              onBlur={() => setHoveredTier(null)}
              style={{
                color: highlighted ? '#ffffff' : TEXT,
                backgroundColor: highlighted ? tierColor : '#ffffff',
                borderColor: highlighted ? tierColor : 'var(--ss-border)',
                borderStyle: 'solid',
                borderWidth: '1.5px',
                borderRadius: '999px',
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: highlighted ? 700 : 600,
                boxShadow: highlighted ? `0 4px 14px ${tierColor}33` : '0 1px 2px rgba(0,0,0,0.03)',
                transform: highlighted ? 'translateY(-1px)' : 'translateY(0)',
              }}
              className="text-base transition-all duration-200 sm:text-lg"
            >
              {AGENTIC_TIER_LABELS[tier]}
            </button>
          );
        })}
      </div>

      <div className="relative mx-auto mt-6 max-w-3xl">
        <div className="flex" style={{ height: '48px', borderRadius: '16px', overflow: 'hidden' }}>
          {HOUR_INTENSITY.map((_, hour) => (
            <div key={hour} style={{ flex: 1, backgroundColor: ribbonColor(tierIntensity(activeTier, hour)) }} />
          ))}
        </div>
        <div className="relative mt-3 flex justify-between text-xs font-semibold" style={{ color: MUTED }}>
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
        <div className="relative mt-3 h-6 text-xs font-semibold">
          <span className="absolute -translate-x-1/2" style={{ left: `${((LIGHTEST_HOUR + 0.5) / 24) * 100}%`, color: '#639922' }}>
            {labels?.easiest ?? ' '}
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: `${((HEAVIEST_HOUR + 0.5) / 24) * 100}%`, color: '#D85A30' }}>
            {labels?.heaviest ?? ' '}
          </span>
        </div>
      </div>
    </section>
  );
};
