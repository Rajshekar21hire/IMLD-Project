import React, { useEffect, useMemo, useRef, useState } from 'react';
import { storyAPI } from '../services/api';
import {
  AGENTIC_MECHANISM_CITIES,
  MechanismCity,
  averageAnnualPm25,
  cigarettesPerDay,
  AGENTIC_SOLUTIONS,
} from '../data/agenticMechanismData';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";
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

const FALLBACK_EXPLAIN = {
  how_to_use: 'Pick a city, then tap a solution to see the number change.',
  description:
    'Each city’s year-round air is translated into an equivalent number of cigarettes smoked per day, using a well-known public-health estimate.',
};

function fallbackBaseText(city: string, cigs: number) {
  return `Spending a day breathing ${city}'s air right now compares to smoking about ${cigs} cigarettes - quietly, without ever lighting one.`;
}

function fallbackSolutionText(city: string, solutionLabel: string, cigs: number) {
  return `If ${city} kept up ${solutionLabel.toLowerCase()}, the air could ease to about ${cigs} cigarettes a day - a real, livable difference.`;
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
  const [solutionId, setSolutionId] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState(cigarettesPerDay(averageAnnualPm25(RANKED_CITIES[0])));
  const [text, setText] = useState(fallbackBaseText(RANKED_CITIES[0], displayedCount));
  const [textStatus, setTextStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [explain, setExplain] = useState(FALLBACK_EXPLAIN);
  const requestId = useRef(0);
  const animRef = useRef<number | undefined>(undefined);

  const solution = AGENTIC_SOLUTIONS.find((s) => s.id === solutionId) || null;
  const color = CITY_COLORS[city];

  const baseAvg = useMemo(() => averageAnnualPm25(city), [city]);
  const baseCigs = useMemo(() => cigarettesPerDay(baseAvg), [baseAvg]);
  const reducedCigs = useMemo(
    () => (solution ? cigarettesPerDay(baseAvg * (1 - solution.pm25ReductionShare)) : null),
    [solution, baseAvg]
  );
  const targetCount = reducedCigs ?? baseCigs;

  // Fetch the "what is this" copy once, on mount.
  useEffect(() => {
    let cancelled = false;
    storyAPI
      .agenticExplain({
        section: 'cigarette-equivalence',
        context: `Ranks ${RANKED_CITIES.join(', ')} by annual average PM2.5 and shows a day of that city's air as an equivalent number of cigarettes smoked (the Berkeley Earth PM2.5-divided-by-22 estimate). Tapping one of four real interventions (ending crop burning, electrifying transport, industrial standards, urban trees) shows the cigarette count fall.`,
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

  // Fetch the Ollama sentence for the current (city, solution) pairing.
  useEffect(() => {
    const myId = ++requestId.current;
    setTextStatus('loading');
    const fallback = solution
      ? fallbackSolutionText(city, solution.label, reducedCigs ?? baseCigs)
      : fallbackBaseText(city, baseCigs);
    setText(fallback);

    storyAPI
      .agenticCigaretteStory({
        city,
        cigarettes: baseCigs,
        solution_label: solution?.label,
        reduced_cigarettes: reducedCigs ?? undefined,
        years_to_notice: solution?.yearsToNotice,
      })
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
  }, [city, solutionId]);

  const intensity = Math.max(0.12, Math.min(1, displayedCount / 25));

  return (
    <div>
      <div className="mx-auto mb-1 max-w-xl text-center text-sm" style={{ color: MUTED }}>
        {explain.how_to_use}
      </div>
      <div className="mx-auto mb-6 max-w-xl text-center text-sm" style={{ color: MUTED }}>
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
                setSolutionId(null);
              }}
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all"
              style={{
                backgroundColor: active ? CITY_COLORS[c] : 'rgba(255,255,255,0.7)',
                color: active ? '#fff' : MUTED,
                border: `1.5px solid ${active ? CITY_COLORS[c] : 'var(--ss-border)'}`,
                boxShadow: active ? `0 6px 16px ${CITY_COLORS[c]}55` : 'none',
              }}
              aria-pressed={active}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div
        className="mx-auto mt-6 max-w-2xl rounded-2xl p-6 text-center"
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

        {solution && reducedCigs !== null && (
          <div className="mt-4 text-sm" style={{ color: MUTED }}>
            with <span style={{ color, fontWeight: 700 }}>{solution.label.toLowerCase()}</span>, felt within about{' '}
            <span style={{ color, fontWeight: 700 }}>{solution.yearsToNotice} years</span>
          </div>
        )}
      </div>

      <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
        {AGENTIC_SOLUTIONS.map((s) => {
          const active = solutionId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSolutionId(active ? null : s.id)}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
              style={{
                backgroundColor: active ? color : 'rgba(255,255,255,0.7)',
                color: active ? '#fff' : MUTED,
                border: `1.5px solid ${active ? color : 'var(--ss-border)'}`,
              }}
              aria-pressed={active}
            >
              {s.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-5 max-w-2xl text-center transition-opacity duration-300" style={{ opacity: textStatus === 'loading' ? 0.5 : 1 }}>
        <p className="text-base leading-relaxed" style={{ fontFamily: SERIF, color: MUTED }}>
          {text}
        </p>
        {textStatus === 'done' && (
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#b8b2a6' }}>
            Ollama generated
          </p>
        )}
      </div>

      <style>{`
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
