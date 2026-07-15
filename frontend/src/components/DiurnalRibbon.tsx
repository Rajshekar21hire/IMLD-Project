import React, { useEffect, useState } from 'react';
import { storyAPI } from '../services/api';
import { AGENTIC_CITIES_PRIMARY } from './WhoAreYouAskingFor';

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

const SAGE = [143, 167, 124];
const AMBER = [201, 168, 106];
const TERRACOTTA = [193, 127, 94];

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

type DayRibbonLabels = { easiest: string; heaviest: string };

export const DiurnalRibbon: React.FC = () => {
  const [city, setCity] = useState<string>(AGENTIC_CITIES_PRIMARY[0]);
  const [labels, setLabels] = useState<DayRibbonLabels | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLabels(null);
    storyAPI
      .agenticDayRibbon({ city })
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success) {
          setLabels({ easiest: res.data.data.easiest, heaviest: res.data.data.heaviest });
        }
      })
      .catch(() => {
        if (!cancelled) setLabels({ easiest: 'easiest in the afternoon', heaviest: 'heaviest at dawn' });
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  return (
    <div className="mx-auto mt-8 w-full max-w-lg text-center">
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {AGENTIC_CITIES_PRIMARY.map((c) => {
          const active = city === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCity(c)}
              style={{
                color: active ? TEXT : MUTED,
                textDecoration: active ? 'underline' : 'none',
                textUnderlineOffset: '4px',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontWeight: active ? 700 : 400,
              }}
              className="text-sm"
            >
              {c}
            </button>
          );
        })}
      </div>

      <div className="relative mt-5 w-full">
        <div className="flex" style={{ height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
          {HOUR_INTENSITY.map((intensity, hour) => (
            <div key={hour} style={{ flex: 1, backgroundColor: ribbonColor(intensity) }} />
          ))}
        </div>
        <div className="relative mt-2 h-6 text-xs" style={{ color: MUTED }}>
          <span className="absolute -translate-x-1/2" style={{ left: `${((LIGHTEST_HOUR + 0.5) / 24) * 100}%` }}>
            {labels?.easiest ?? ' '}
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: `${((HEAVIEST_HOUR + 0.5) / 24) * 100}%`, color: ACCENT }}>
            {labels?.heaviest ?? ' '}
          </span>
        </div>
      </div>
    </div>
  );
};
