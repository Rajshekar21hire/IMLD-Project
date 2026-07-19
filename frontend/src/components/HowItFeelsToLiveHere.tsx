import React, { useEffect, useMemo, useRef, useState } from 'react';
import { storyAPI } from '../services/api';
import {
  AGENTIC_MECHANISM_CITIES,
  MechanismCity,
  averageAnnualPm25,
  cigarettesPerDay,
  AGENTIC_FACTORS,
} from '../data/agenticMechanismData';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';
const SERIF = 'inherit';
const COUNT_ANIM_MS = 900;

// Same five-colour palette used for these cities everywhere else in the section (PersonalizedClosing's
// CITY_PALETTE), so a city keeps the same identity colour across every beat.
const CITY_COLORS: Record<MechanismCity, string> = {
  Delhi: '#8fa77c',
  Lahore: '#c9a86a',
  Dhaka: '#c17f5e',
  Kathmandu: '#5b9aa8',
  Kolkata: '#a78bfa',
};

const RANKED_CITIES = [...AGENTIC_MECHANISM_CITIES].sort(
  (a, b) => averageAnnualPm25(b) - averageAnnualPm25(a)
);

// Ranked worst->best colors for the city selector pills, intentionally moving from
// purple (worst burden) toward green (cleaner burden).
const RANK_BUTTON_COLORS = ['#a78bfa', '#8b9be6', '#7ea6d6', '#83b39d', '#8fa77c'];
const BUTTON_COLOR_BY_CITY: Record<MechanismCity, string> = RANKED_CITIES.reduce((acc, city, index) => {
  acc[city] = RANK_BUTTON_COLORS[index] || RANK_BUTTON_COLORS[RANK_BUTTON_COLORS.length - 1];
  return acc;
}, {} as Record<MechanismCity, string>);

const FALLBACK_EXPLAIN = {
  how_to_use: 'Pick a city, then flip a card to see how it shapes that city\'s air.',
  description:
    'Each city’s year-round air is translated into an equivalent number of cigarettes smoked per day, using a well-known public-health estimate.',
};

function fallbackBaseText(city: string, cigs: number) {
  return `Spending a day breathing ${city}'s air right now compares to smoking about ${cigs} cigarettes - quietly, without ever lighting one.`;
}

function fallbackFactorText(city: string, factorLabel: string) {
  return `In ${city}, ${factorLabel.toLowerCase()} is one of the quiet reasons the air feels the way it does on an ordinary day.`;
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// A single realistic, animated burning cigarette - paper with subtle shading, a printed cork
// filter, a glowing flickering ember, and curling rising smoke - rather than a row of small flat
// sketch icons repeated once per cigarette. Smoke density and ember glow both scale with
// `intensity` (0-1, the current cigarette count normalised), so a worse city visibly smokes more.
const RealisticCigarette: React.FC<{ color: string; intensity: number }> = ({ color, intensity }) => {
  const wispCount = 1 + Math.round(Math.max(0, Math.min(1, intensity)) * 3);
  const glowRadius = 15 + intensity * 9;

  return (
    <svg viewBox="0 0 220 100" width={220} height={100} className="hifl-hero" aria-hidden="true">
      <defs>
        <linearGradient id="hifl-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fdfdfa" />
          <stop offset="100%" stopColor="#e4e1d8" />
        </linearGradient>
        <radialGradient id="hifl-ember-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3c4" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#f6a94a" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* smoke, rising from the ember */}
      {Array.from({ length: wispCount }).map((_, i) => (
        <path
          key={i}
          d={`M${34 - i * 4} 60 C ${18 - i * 5} 42, ${44 - i * 3} 30, ${24 - i * 6} 6`}
          fill="none"
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
          opacity={0.4 - i * 0.06}
          className={`hifl-smoke-wisp hifl-smoke-wisp-${i}`}
        />
      ))}

      {/* paper body */}
      <rect x="40" y="60" width="130" height="16" rx="8" fill="url(#hifl-paper)" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
      <line x1="55" y1="61" x2="55" y2="75" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      <line x1="95" y1="61" x2="95" y2="75" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      <line x1="135" y1="61" x2="135" y2="75" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />

      {/* cork filter */}
      <rect x="170" y="60" width="34" height="16" rx="6" fill="#c9915b" />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={i} x1={172 + i * 5.5} y1="61" x2={176 + i * 5.5} y2="75" stroke="#a06f3c" strokeWidth="1" opacity="0.55" />
      ))}

      {/* glowing ember */}
      <circle cx="36" cy="68" r={glowRadius} fill="url(#hifl-ember-glow)" className="hifl-glow" />
      <ellipse cx="34" cy="68" rx="6.5" ry="8.5" fill="#f2601c" className="hifl-ember-core" />
      <ellipse cx="33" cy="67" rx="3" ry="4" fill="#fde68a" opacity="0.85" className="hifl-ember-core" />
    </svg>
  );
};

export const HowItFeelsToLiveHere: React.FC = () => {
  const [city, setCity] = useState<MechanismCity>(RANKED_CITIES[0]);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState(cigarettesPerDay(averageAnnualPm25(RANKED_CITIES[0])));
  const [text, setText] = useState(fallbackBaseText(RANKED_CITIES[0], displayedCount));
  const [textStatus, setTextStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explain, setExplain] = useState(FALLBACK_EXPLAIN);
  const requestId = useRef(0);
  const animRef = useRef<number | undefined>(undefined);

  const factor = AGENTIC_FACTORS.find((f) => f.id === factorId) || null;
  const color = CITY_COLORS[city];
  const activeButtonColor = BUTTON_COLOR_BY_CITY[city];

  const baseAvg = useMemo(() => averageAnnualPm25(city), [city]);
  const baseCigs = useMemo(() => cigarettesPerDay(baseAvg), [baseAvg]);
  const targetCount = baseCigs;

  // Fetch the "what is this" copy once, on mount.
  useEffect(() => {
    let cancelled = false;
    storyAPI
      .agenticExplain({
        section: 'cigarette-equivalence',
        context: `Ranks ${RANKED_CITIES.join(', ')} by annual average PM2.5 and shows a day of that city's air as an equivalent number of cigarettes smoked (the Berkeley Earth PM2.5-divided-by-22 estimate). Flipping one of seven driver cards (geography & meteorology, urban sprawl & construction, governance gap, transport, brick kilns, industry & power, crop burning) reveals a sentence on how that driver plays out in the selected city.`,
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

  // Animate the displayed cigarette count toward the target whenever city/solution changes.
  useEffect(() => {
    const from = displayedCount;
    const to = targetCount;
    if (from === to) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_ANIM_MS);
      const eased = 1 - Math.pow(1 - t, 2);
      const next = Math.round(from + (to - from) * eased);
      setDisplayedCount(next);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current !== undefined) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCount]);

  // Fetch the Ollama sentence for the current (city, factor) pairing.
  useEffect(() => {
    const myId = ++requestId.current;
    setTextStatus('loading');
    const fallback = factor ? fallbackFactorText(city, factor.label) : fallbackBaseText(city, baseCigs);
    setText(fallback);

    const request = factor
      ? storyAPI.agenticFactorStory({
          city,
          factor_label: factor.label,
          factor_description: factor.description,
        })
      : storyAPI.agenticCigaretteStory({ city, cigarettes: baseCigs });

    request
      .then((res) => {
        if (requestId.current !== myId) return;
        if (res.data?.success && res.data.data?.text) {
          setText(res.data.data.text);
          setTextStatus('done');
        } else {
          setTextStatus('idle');
        }
      })
      .catch(() => {
        if (requestId.current !== myId) return;
        setTextStatus('idle');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, factorId]);

  const intensity = Math.max(0.12, Math.min(1, displayedCount / 25));

  return (
    <div>
      <div className="mx-auto mb-1 max-w-[72rem] text-center text-sm" style={{ color: MUTED }}>
        {explain.how_to_use}
      </div>
      <div className="mx-auto mb-6 max-w-[72rem] text-center text-sm" style={{ color: MUTED }}>
        {explain.description}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {RANKED_CITIES.map((c) => {
          const active = c === city;
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCity(c);
                setFactorId(null);
              }}
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all"
              style={{
                backgroundColor: active ? BUTTON_COLOR_BY_CITY[c] : 'rgba(255,255,255,0.7)',
                color: active ? '#fff' : MUTED,
                border: `1.5px solid ${active ? BUTTON_COLOR_BY_CITY[c] : 'var(--ss-border)'}`,
                boxShadow: active ? `0 6px 16px ${BUTTON_COLOR_BY_CITY[c]}55` : 'none',
              }}
              aria-pressed={active}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div
        className="mx-auto mt-6 max-w-[84rem] rounded-2xl p-6 text-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.86)', border: `1px solid ${color}33` }}
      >
        <div className="text-5xl font-black leading-none" style={{ color }}>
          {displayedCount}
        </div>
        <div className="mt-1 text-sm font-semibold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
          cigarettes a day, just by breathing in {city}
        </div>

        <div className="mx-auto mt-3 flex justify-center">
          <RealisticCigarette color={color} intensity={intensity} />
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-[84rem] flex-wrap justify-center gap-3">
        {AGENTIC_FACTORS.map((f) => {
          const active = factorId === f.id;
          return (
            <div
              key={f.id}
              className="hifl-flip-card"
              style={{ perspective: '1000px' }}
            >
              <button
                type="button"
                onClick={() => setFactorId(active ? null : f.id)}
                aria-pressed={active}
                className={`hifl-flip-card-inner ${active ? 'is-flipped' : ''}`}
              >
                <div
                  className="hifl-flip-face hifl-flip-front"
                  style={{ backgroundColor: 'rgba(255,255,255,0.86)', border: '1.5px solid var(--ss-border)' }}
                >
                  <span className="hifl-card-icon text-2xl" aria-hidden="true">{f.icon}</span>
                  <span className="hifl-card-label mt-1 text-sm font-semibold" style={{ color: MUTED }}>
                    {f.label}
                  </span>
                </div>
                <div
                  className="hifl-flip-face hifl-flip-back"
                  style={{ backgroundColor: color, border: `1.5px solid ${color}` }}
                >
                  <span className="hifl-card-icon text-2xl" aria-hidden="true">{f.icon}</span>
                  <span className="hifl-card-label mt-1 text-sm font-semibold text-white">{f.label}</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-5 max-w-[84rem] transition-opacity duration-300" style={{ opacity: textStatus === 'loading' ? 0.5 : 1 }}>
        <div
          className="rounded-2xl p-5 text-center"
          style={{
            background: `linear-gradient(180deg, ${hexToRgba(activeButtonColor, 0.18)} 0%, rgba(255,255,255,0.94) 58%)`,
            border: `1.5px solid ${hexToRgba(activeButtonColor, 0.5)}`,
            boxShadow: `0 8px 22px ${hexToRgba(activeButtonColor, 0.16)}`,
          }}
        >
          <p className="text-base leading-relaxed" style={{ fontFamily: SERIF, color: MUTED }}>
            {text}
          </p>
        </div>
      </div>

      <style>{`
        .hifl-flip-card {
          width: 10.75rem;
          height: 6.25rem;
          flex: 0 0 auto;
        }
        .hifl-flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
          cursor: pointer;
          border: none;
          background: none;
          padding: 0;
        }
        .hifl-flip-card-inner.is-flipped { transform: rotateY(180deg); }
        .hifl-flip-face {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          padding: 0.5rem 0.6rem;
          border-radius: 1rem;
          backface-visibility: hidden;
        }
        .hifl-card-icon {
          line-height: 1;
          margin-top: 0.05rem;
        }
        .hifl-card-label {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 2.6rem;
          line-height: 1.2;
          overflow-wrap: anywhere;
          width: 100%;
        }
        .hifl-flip-back { transform: rotateY(180deg); }
        @media (prefers-reduced-motion: reduce) {
          .hifl-flip-card-inner { transition: none; }
        }
        .hifl-hero { overflow: visible; }
        .hifl-glow { animation: hifl-glow-pulse 1.8s ease-in-out infinite; transform-origin: 36px 68px; }
        .hifl-ember-core { animation: hifl-ember-flicker 1.1s ease-in-out infinite; transform-origin: 34px 68px; }
        @keyframes hifl-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes hifl-ember-flicker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .hifl-smoke-wisp {
          filter: blur(0.5px);
          animation-name: hifl-smoke-rise-real;
          animation-duration: 3.6s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .hifl-smoke-wisp-0 { animation-delay: 0s; }
        .hifl-smoke-wisp-1 { animation-delay: 0.9s; }
        .hifl-smoke-wisp-2 { animation-delay: 1.8s; }
        .hifl-smoke-wisp-3 { animation-delay: 2.7s; }
        @keyframes hifl-smoke-rise-real {
          0% { opacity: 0; transform: translateY(8px) scale(0.9); }
          25% { opacity: 0.55; }
          100% { opacity: 0; transform: translateY(-30px) scale(1.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hifl-glow, .hifl-ember-core, .hifl-smoke-wisp { animation: none; }
        }
      `}</style>
    </div>
  );
};
