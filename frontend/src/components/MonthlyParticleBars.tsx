import React, { useEffect, useMemo, useRef, useState } from 'react';
import { storyAPI } from '../services/api';
import {
  AGENTIC_TIERED_CITIES,
  AGENTIC_TIER_LABELS,
  AgenticCityTier,
  AQI_CATEGORY_INFO,
  AQI_HEALTH_EFFECTS,
  MONTH_LABELS,
  aqiCategory,
  averageOf,
  getTieredCity,
  pm25ToAqi,
} from '../data/agenticMechanismData';
import { useAgenticOllamaCaption } from './useAgenticOllamaCaption';
import { AgenticCaption } from './AgenticCaption';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';

const TIERS: AgenticCityTier[] = ['worst', 'medium', 'best'];
const GLOBAL_MAX_AQI = Math.max(...AGENTIC_TIERED_CITIES.flatMap((c) => c.monthly.map(pm25ToAqi)));

const TIER_BUTTON_COLORS: Record<AgenticCityTier, string> = {
  worst: '#D85A30',
  medium: '#B8D53A',
  best: '#639922',
};

const FALLBACK_EXPLAIN = {
  how_to_use: 'Pick a city, then hover or tap any bar to see that month’s AQI.',
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

// Standard US EPA AQI colour stops (Good -> Hazardous), interpolated between stops so the tint
// slides smoothly instead of jumping at each category boundary.
const AQI_COLOR_STOPS: { aqi: number; hex: string }[] = [
  { aqi: 0, hex: '#00e400' },
  { aqi: 50, hex: '#00e400' },
  { aqi: 100, hex: '#ffff00' },
  { aqi: 150, hex: '#ff7e00' },
  { aqi: 200, hex: '#ff0000' },
  { aqi: 300, hex: '#8f3f97' },
  { aqi: 500, hex: '#7e0023' },
];

function aqiToRgb(aqi: number): Rgb {
  const clamped = Math.max(0, Math.min(500, aqi));
  for (let i = 0; i < AQI_COLOR_STOPS.length - 1; i += 1) {
    const lo = AQI_COLOR_STOPS[i];
    const hi = AQI_COLOR_STOPS[i + 1];
    if (clamped >= lo.aqi && clamped <= hi.aqi) {
      const t = hi.aqi === lo.aqi ? 0 : (clamped - lo.aqi) / (hi.aqi - lo.aqi);
      return mixRgb(lo.hex, hi.hex, t);
    }
  }
  return hexToRgb(AQI_COLOR_STOPS[AQI_COLOR_STOPS.length - 1].hex);
}

function particleCountFor(aqi: number) {
  const t = Math.max(0, Math.min(1, aqi / GLOBAL_MAX_AQI));
  return Math.round(4 + t * 22);
}

type Particle = { month: number; baseX: number; x: number; y: number; vy: number; wobble: number; size: number };

function buildParticles(monthlyAqi: number[]): Particle[] {
  const list: Particle[] = [];
  monthlyAqi.forEach((value, month) => {
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
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [activeEffectId, setActiveEffectId] = useState<string | null>(null);
  const [explain, setExplain] = useState(FALLBACK_EXPLAIN);

  const tieredCity = useMemo(() => getTieredCity(city), [city]);
  const monthly = tieredCity.monthly;
  const monthlyAqi = useMemo(() => monthly.map(pm25ToAqi), [monthly]);

  const cityCategory = useMemo(() => aqiCategory(pm25ToAqi(averageOf(monthly))), [monthly]);
  const healthEffects = AQI_HEALTH_EFFECTS[cityCategory];
  const categoryInfo = AQI_CATEGORY_INFO[cityCategory];
  const activeEffect = healthEffects.find((e) => e.id === activeEffectId) || null;

  useEffect(() => {
    setActiveEffectId(null);
  }, [city]);

  const particles = useMemo(() => buildParticles(monthlyAqi), [monthlyAqi]);
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
          'Twelve vertical bars, one per month, for a chosen city out of three of the world\'s most polluted, two mid-range, and two of the cleanest. Floating particle density and a green-to-red AQI tint both represent that month\'s air quality index. Hovering or tapping a bar shows its exact AQI and category. A row of health effect buttons below the chart lists the real health issues (or, for clean cities, benefits) tied to that city\'s typical AQI category.',
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
        acc[c.city] = pm25ToAqi(averageOf(c.monthly));
        return acc;
      }, {}),
    []
  );

  const userMessage = useMemo(
    () =>
      `Chart type: 12 monthly bars of AQI severity, city picker across worst/medium/best air-quality tiers. Annual average AQI by city: ${JSON.stringify(
        cityAverages
      )}. Currently showing ${city}, typically in the "${categoryInfo.label}" AQI band.`,
    [cityAverages, city, categoryInfo]
  );
  const FALLBACK_CAPTION = `${city}'s months swing from calm to heavy and back - its air typically sits in the "${categoryInfo.label}" band, while the cleanest cities on this chart barely leave green all year.`;
  const { text: caption, status } = useAgenticOllamaCaption(userMessage, FALLBACK_CAPTION);

  const displayedMonth = hovered !== null ? hovered : pinned;
  const displayedAqi = displayedMonth !== null ? monthlyAqi[displayedMonth] : null;
  const displayedCategory = displayedAqi !== null ? AQI_CATEGORY_INFO[aqiCategory(displayedAqi)] : null;

  return (
    <div>
      <div className="mx-auto mb-1 max-w-[84rem] text-center" style={{ color: TEXT, fontSize: '1.125rem', lineHeight: 1.8, fontFamily: 'inherit' }}>
        {explain.how_to_use}
        <br />
      </div>
      <div className="mx-auto mb-6 max-w-[84rem] text-center" style={{ color: TEXT, fontSize: '1.125rem', lineHeight: 1.8, fontFamily: 'inherit' }}>
        {explain.description}
        <br />
      </div>

      <div className="flex flex-wrap items-start justify-center gap-6">
        {TIERS.map((tier) => (
          <div key={tier} className="flex flex-col items-center gap-2">
            <div className="text-sm font-bold uppercase tracking-[0.15em] text-slate-900" style={{}}>
              {AGENTIC_TIER_LABELS[tier]}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {AGENTIC_TIERED_CITIES.filter((c) => c.tier === tier).map((c) => {
                const active = c.city === city;
                const highlighted = active || hoveredCity === c.city;
                const tierColor = TIER_BUTTON_COLORS[tier];
                return (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => {
                      setCity(c.city);
                      setPinned(null);
                    }}
                    onMouseEnter={() => setHoveredCity(c.city)}
                    onMouseLeave={() => setHoveredCity(null)}
                    onFocus={() => setHoveredCity(c.city)}
                    onBlur={() => setHoveredCity(null)}
                    className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: highlighted ? tierColor : 'rgba(255,255,255,0.82)',
                      color: highlighted ? '#fff' : MUTED,
                      border: `1.5px solid ${highlighted ? tierColor : 'rgba(148, 163, 184, 0.45)'}`,
                      boxShadow: highlighted ? `0 6px 16px rgba(0, 0, 0, 0.15)` : '0 1px 2px rgba(15, 23, 42, 0.04)',
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

      <div className="relative mx-auto mt-6 flex max-w-[96rem] items-end justify-center gap-2 sm:gap-3">
        {MONTH_LABELS.map((month, monthIdx) => {
          const aqi = monthlyAqi[monthIdx];
          const rgb = aqiToRgb(aqi);
          const isPinned = pinned === monthIdx;
          const category = AQI_CATEGORY_INFO[aqiCategory(aqi)];
          return (
            <button
              key={month}
              type="button"
              onClick={() => setPinned((cur) => (cur === monthIdx ? null : monthIdx))}
              onMouseEnter={() => setHovered(monthIdx)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(monthIdx)}
              onBlur={() => setHovered(null)}
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
              aria-label={`${month}, ${city}: AQI ${aqi}, ${category.label}. ${category.summary} Tap to pin.`}
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

        {displayedMonth !== null && displayedAqi !== null && displayedCategory !== null && (
          <div
            className="pointer-events-none absolute rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-lg"
            style={{ top: '-3rem', left: '50%', transform: 'translateX(-50%)', color: TEXT, border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <span className="font-semibold">
              {city} · {MONTH_LABELS[displayedMonth]}
            </span>{' '}
            — AQI {displayedAqi} ({displayedCategory.label})
            <div className="mt-0.5 max-w-[220px]" style={{ color: MUTED }}>
              {displayedCategory.summary}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-center" style={{ color: TEXT, fontSize: '1.125rem', lineHeight: 1.8, fontFamily: 'inherit' }}>
        <br />
        More particles and a redder tint mean worse air that month; fewer particles and green mean cleaner air. Hover or tap any bar to see its AQI.
      </div>

      <div className="mx-auto mt-8 flex max-w-[84rem] flex-col items-center gap-2">
        <div className="text-sm font-semibold" style={{ color: TEXT }}>
          {cityCategory === 'good' ? `Health benefits of ${city}'s air` : `Health issues linked to ${city}'s air`}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {healthEffects.map((effect) => {
            const active = effect.id === activeEffectId;
            const swatch = categoryInfo.color;
            return (
              <button
                key={effect.id}
                type="button"
                onClick={() => setActiveEffectId((cur) => (cur === effect.id ? null : effect.id))}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? swatch : 'rgba(255,255,255,0.7)',
                  color: active ? '#fff' : MUTED,
                  border: `1.5px solid ${active ? swatch : 'var(--ss-border)'}`,
                }}
                aria-pressed={active}
              >
                {effect.label}
              </button>
            );
          })}
        </div>
        {activeEffect && (
          <div className="mt-1 max-w-[56rem] text-center text-xs" style={{ color: MUTED }}>
            {activeEffect.description}
          </div>
        )}
      </div>

      <AgenticCaption text={caption} loading={status === 'loading'} generated={false} />

      <style>{`
        .mpb-dot { border-radius: 9999px; }
        @media (prefers-reduced-motion: reduce) {
          .mpb-dot { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
