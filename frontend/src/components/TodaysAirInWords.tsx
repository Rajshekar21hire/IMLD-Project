import React, { useState } from 'react';
import { storyAPI } from '../services/api';
import { AGENTIC_CITIES, AGENTIC_CITIES_PRIMARY, AGENTIC_CITIES_MORE } from './WhoAreYouAskingFor';
import { useAgenticText } from './useAgenticText';

const TEXT = '#232323';
const MUTED = '#8b8780';
const ACCENT = '#0d9488';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";
const PALETTE = ['#8fa77c', '#c9a86a', '#c17f5e'];
const colorForCity = (city: string) => PALETTE[AGENTIC_CITIES.indexOf(city) % PALETTE.length] || PALETTE[0];

// Heavy at dawn, easing by mid-afternoon, thickening again at night.
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

export const TodaysAirInWords: React.FC = () => {
  const [city, setCity] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const { data, loading } = useAgenticText(
    Boolean(city),
    () => storyAPI.agenticAirWords({ city }),
    [city]
  );

  const { data: ribbon } = useAgenticText(
    Boolean(city),
    () => storyAPI.agenticDayRibbon({ city }),
    [city]
  );

  const visibleCities = showMore ? AGENTIC_CITIES : AGENTIC_CITIES_PRIMARY;

  return (
    <div className="text-center">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        {visibleCities.map((c) => {
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
              className="text-lg"
            >
              {c}
            </button>
          );
        })}
        {!showMore && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            style={{ color: ACCENT, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            className="text-lg font-semibold hover:underline"
          >
            + More cities
          </button>
        )}
      </div>

      {city && (
        <div className="mt-10 flex flex-col items-center">
          <div
            className="ic-breathe"
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              backgroundColor: colorForCity(city),
              opacity: 0.55,
            }}
          />
          <div
            className="mt-6 max-w-lg text-xl leading-relaxed transition-opacity duration-700"
            style={{ fontFamily: SERIF, color: TEXT, opacity: loading ? 0 : 1 }}
          >
            {data?.sentence}
          </div>

          <div className="relative mt-10 w-full max-w-lg">
            <div
              className="flex"
              style={{ height: '28px', borderRadius: '14px', overflow: 'hidden' }}
            >
              {HOUR_INTENSITY.map((intensity, hour) => (
                <div key={hour} style={{ flex: 1, backgroundColor: ribbonColor(intensity) }} />
              ))}
            </div>
            <div className="relative mt-2 h-8 text-sm" style={{ color: MUTED }}>
              <span
                className="absolute -translate-x-1/2"
                style={{ left: `${((LIGHTEST_HOUR + 0.5) / 24) * 100}%` }}
              >
                {ribbon?.easiest}
              </span>
              <span
                className="absolute -translate-x-1/2"
                style={{ left: `${((HEAVIEST_HOUR + 0.5) / 24) * 100}%` }}
              >
                {ribbon?.heaviest}
              </span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ic-breathe {
          animation: tw-breathe 4s ease-in-out infinite;
        }
        @keyframes tw-breathe {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.35); opacity: 0.65; }
        }
      `}</style>
    </div>
  );
};
