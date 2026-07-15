import React, { useEffect, useMemo, useRef, useState } from 'react';
import { storyAPI } from '../services/api';
import {
  AGENTIC_SOLUTIONS,
  AGENTIC_TIERED_CITIES,
  AGENTIC_TIER_LABELS,
  AgenticCityTier,
  MONTH_LABELS,
  WHO_24H_GUIDELINE_PM25,
  averageOf,
  getTieredCity,
} from '../data/agenticMechanismData';
import { useAgenticOllamaCaption } from './useAgenticOllamaCaption';
import { AgenticCaption } from './AgenticCaption';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';

const TIERS: AgenticCityTier[] = ['worst', 'medium', 'best'];
const GLOBAL_MAX = Math.max(...AGENTIC_TIERED_CITIES.flatMap((c) => c.monthly));

const FALLBACK_EXPLAIN = {
  how_to_use: 'Pick a city, then tap any bar to see that month’s number.',
  description:
    'Each bar is one month. More drifting particles and a redder tint both mean worse air; fewer particles and green means cleaner air.',
};

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function mixRgb(hexA: string, hexB: string, t: number): Rgb {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const c = (k: 'r' | 'g' | 'b') => Math.round(a[k] + (b[k] - a[k]) * t);
  return { r: c('r'), g: c('g'), b: c('b') };
}
function rgbCss({ r, g, b }: Rgb) {
  return `rgb(${r}, ${g}, ${b})`;
}
function rgbaCss({ r, g, b }: Rgb, alpha: number) {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Muted palette anchored at the WHO 24-hour guideline: green below it, sliding into a soft (never
// saturated-red-alarm) red above it. Deliberately more saturated than a pale wash so the boxes and
// particles both stay clearly visible - only the tube's own background fill uses a low-alpha cut
// of the same colour, so the section still reads as quiet rather than a bright dashboard.
function severityRgb(value: number): Rgb {
  if (value <= WHO_24H_GUIDELINE_PM25) {
    const t = Math.max(0, Math.min(1, value / WHO_24H_GUIDELINE_PM25));
    return mixRgb('#dcefe0', '#3f8f5c', t);
  }
  const t = Math.max(0, Math.min(1, (value - WHO_24H_GUIDELINE_PM25) / (GLOBAL_MAX - WHO_24H_GUIDELINE_PM25)));
  return mixRgb('#f6d9a0', '#c8564f', t);
}

function particleCountFor(value: number) {
  const t = Math.max(0, Math.min(1, value / GLOBAL_MAX));
  return Math.round(4 + t * 22);
}

type Particle = { month: number; baseX: number; x: number; y: number; vy: number; wobble: number; size: number };

function buildParticles(monthly: number[]): Particle[] {
  const list: Particle[] = [];
  monthly.forEach((value, month) => {
    const n = particleCountFor(value);
    for (let i = 0; i < n; i += 1) {
      const baseX = 18 + Math.random() * 64;
      list.push({
        month,
        baseX,
        x: baseX,
        y: 4 + Math.random() * 92,
        vy: (Math.random() - 0.5) * 0.22,
        wobble: Math.random() * Math.PI * 2,
        size: 3 + Math.random() * 3,
      });
    }
  });
  return list;
}

export const MonthlyParticleBars: React.FC = () => {
  const [city, setCity] = useState<string>(AGENTIC_TIERED_CITIES[0].city);
  const [pinned, setPinned] = useState<number | null>(null);
  const [solutionIds, setSolutionIds] = useState<string[]>([]);
  const [explain, setExplain] = useState(FALLBACK_EXPLAIN);

  const tieredCity = useMemo(() => getTieredCity(city), [city]);
  const monthly = tieredCity.monthly;

  const selectedSolutions = AGENTIC_SOLUTIONS.filter((s) => solutionIds.includes(s.id));
  const combinedShare = Math.min(0.85, selectedSolutions.reduce((s, sol) => s + sol.pm25ReductionShare, 0));
  // What the 12 bars actually render - the city's real monthly values with any selected
  // solutions' combined PM2.5 cut applied, so toggling a solution redraws the particles live.
  const effectiveMonthly = useMemo(() => monthly.map((v) => v * (1 - combinedShare)), [monthly, combinedShare]);

  const particles = useMemo(() => buildParticles(effectiveMonthly), [effectiveMonthly]);
  const particlesRef = useRef<Particle[]>(particles);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    particlesRef.current = particles;
    dotRefs.current = particles.map(() => null);
  }, [particles]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const step = () => {
      particlesRef.current.forEach((p, i) => {
        p.y += p.vy;
        if (p.y > 94) {
          p.y = 94;
          p.vy *= -1;
        } else if (p.y < 6) {
          p.y = 6;
          p.vy *= -1;
        }
        p.wobble += 0.015;
        p.x = p.baseX + Math.sin(p.wobble) * 5;
        const el = dotRefs.current[i];
        if (!el) return;
        el.style.top = `${p.y}%`;
        el.style.left = `${p.x}%`;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    storyAPI
      .agenticExplain({
        section: 'monthly-particle-bars',
        context:
          'Twelve vertical bars, one per month, for a chosen city out of three of the world\'s most polluted, two mid-range, and two of the cleanest. Floating particle density and a green-to-red tint both represent that month\'s PM2.5 severity. Clicking a bar pins its exact value. Toggling any of four real interventions (ending crop burning, electrifying transport, industrial standards, urban trees) applies their combined PM2.5 cut and the bars redraw with fewer, greener particles.',
      })
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success) {
          setExplain({ how_to_use: res.data.data.how_to_use, description: res.data.data.description });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const cityAverages = useMemo(
    () =>
      AGENTIC_TIERED_CITIES.reduce<Record<string, number>>((acc, c) => {
        acc[c.city] = Math.round(averageOf(c.monthly));
        return acc;
      }, {}),
    []
  );

  const userMessage = useMemo(
    () =>
      `Chart type: 12 monthly bars of PM2.5 severity, city picker across worst/medium/best air-quality tiers. Annual averages by city: ${JSON.stringify(
        cityAverages
      )}. Currently showing ${city}${
        selectedSolutions.length
          ? ` with ${selectedSolutions.map((s) => s.label).join(', ')} applied (a combined ${Math.round(combinedShare * 100)}% cut)`
          : ''
      }. WHO 24-hour guideline is ${WHO_24H_GUIDELINE_PM25} µg/m³.`,
    [cityAverages, city, selectedSolutions, combinedShare]
  );
  const FALLBACK_CAPTION = selectedSolutions.length
    ? `With ${selectedSolutions[0].label.toLowerCase()} in place, ${city}'s bars thin out and cool toward green - the same months, breathing easier.`
    : `${city}'s months swing from calm to heavy and back - the cleanest cities on this chart barely leave the green all year.`;
  const { text: caption, status } = useAgenticOllamaCaption(userMessage, FALLBACK_CAPTION);

  const pinnedValue = pinned !== null ? effectiveMonthly[pinned] : null;

  return (
    <div>
      <div className="mx-auto mb-1 max-w-xl text-center text-sm" style={{ color: MUTED }}>
        {explain.how_to_use}
      </div>
      <div className="mx-auto mb-6 max-w-xl text-center text-sm" style={{ color: MUTED }}>
        {explain.description}
      </div>

      <div className="flex flex-wrap items-start justify-center gap-6">
        {TIERS.map((tier) => (
          <div key={tier} className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
              {AGENTIC_TIER_LABELS[tier]}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {AGENTIC_TIERED_CITIES.filter((c) => c.tier === tier).map((c) => {
                const active = c.city === city;
                const swatch = rgbCss(severityRgb(averageOf(c.monthly)));
                return (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => {
                      setCity(c.city);
                      setPinned(null);
                    }}
                    className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: active ? swatch : 'rgba(255,255,255,0.7)',
                      color: active ? '#173764' : MUTED,
                      border: `1.5px solid ${active ? swatch : 'var(--ss-border)'}`,
                    }}
                    aria-pressed={active}
                  >
                    {c.city}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-2">
        <div className="text-sm font-semibold" style={{ color: TEXT }}>
          Solutions to try
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {AGENTIC_SOLUTIONS.map((s) => {
            const active = solutionIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSolutionIds((cur) => (active ? cur.filter((id) => id !== s.id) : [...cur, s.id]))}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? '#3f8f5c' : 'rgba(255,255,255,0.7)',
                  color: active ? '#fff' : MUTED,
                  border: `1.5px solid ${active ? '#3f8f5c' : 'var(--ss-border)'}`,
                }}
                aria-pressed={active}
              >
                {s.shortLabel}
              </button>
            );
          })}
        </div>
        {selectedSolutions.length > 0 && (
          <div className="text-xs" style={{ color: MUTED }}>
            combined cut: <span style={{ color: '#3f8f5c', fontWeight: 700 }}>{Math.round(combinedShare * 100)}%</span>
          </div>
        )}
      </div>

      <div className="relative mx-auto mt-6 flex max-w-3xl items-end justify-center gap-2 sm:gap-3">
        {MONTH_LABELS.map((month, monthIdx) => {
          const value = effectiveMonthly[monthIdx];
          const rgb = severityRgb(value);
          const isPinned = pinned === monthIdx;
          return (
            <button
              key={month}
              type="button"
              onClick={() => setPinned((cur) => (cur === monthIdx ? null : monthIdx))}
              className="mpb-tube relative overflow-hidden rounded-xl"
              style={{
                width: '100%',
                maxWidth: 44,
                height: 200,
                background: `linear-gradient(180deg, ${rgbaCss(rgb, 0.22)} 0%, ${rgbaCss(rgb, 0.05)} 70%)`,
                border: `2.5px solid ${rgbaCss(rgb, isPinned ? 1 : 0.85)}`,
                boxShadow: isPinned ? `0 8px 20px ${rgbaCss(rgb, 0.45)}` : `inset 0 0 0 1px ${rgbaCss(rgb, 0.15)}`,
                cursor: 'pointer',
              }}
              aria-label={`${month}, ${city}: ${Math.round(value)} micrograms per cubic metre PM2.5. Tap to pin.`}
              aria-pressed={isPinned}
            >
              {particles.map(
                (p, i) =>
                  p.month === monthIdx && (
                    <div
                      key={i}
                      ref={(el) => {
                        dotRefs.current[i] = el;
                      }}
                      className="mpb-dot"
                      style={{
                        position: 'absolute',
                        top: `${p.y}%`,
                        left: `${p.x}%`,
                        width: p.size,
                        height: p.size,
                        background: rgbaCss(rgb, 0.95),
                        boxShadow: `0 0 3px ${rgbaCss(rgb, 0.6)}`,
                      }}
                    />
                  )
              )}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[10px] font-semibold"
                style={{ color: MUTED }}
              >
                {month}
              </div>
            </button>
          );
        })}

        {pinnedValue !== null && pinned !== null && (
          <div
            className="absolute rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-lg"
            style={{ top: '-2.5rem', left: '50%', transform: 'translateX(-50%)', color: TEXT, border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <span className="font-semibold">
              {city} · {MONTH_LABELS[pinned]}
            </span>{' '}
            — {Math.round(pinnedValue)} µg/m³ ({pinnedValue <= WHO_24H_GUIDELINE_PM25 ? 'at or under' : 'above'} the WHO guideline)
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-xs" style={{ color: MUTED }}>
        More particles and a redder tint mean worse air that month; fewer particles and green mean cleaner air. Tap any bar to pin its value, or toggle a solution above to watch every bar redraw.
      </div>

      <AgenticCaption text={caption} loading={status === 'loading'} generated={status === 'done'} />

      <style>{`
        .mpb-dot { border-radius: 9999px; }
        @media (prefers-reduced-motion: reduce) {
          .mpb-dot { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
