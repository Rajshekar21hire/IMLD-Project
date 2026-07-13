import React, { useState } from 'react';
import { storyAPI } from '../services/api';
import { useAgenticText } from './useAgenticText';

const TEXT = '#232323';
const MUTED = '#8b8780';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";

const SOURCES = [
  { key: 'traffic', label: 'Traffic' },
  { key: 'kilns', label: 'Kilns' },
  { key: 'cooking', label: 'Cooking smoke' },
  { key: 'crop-burning', label: 'Crop burning' },
];

const NOW_RGB = [156, 145, 132];
const CLEAR_RGB = [169, 205, 219];

function skyColor(t: number) {
  const [r, g, b] = [
    Math.round(NOW_RGB[0] + (CLEAR_RGB[0] - NOW_RGB[0]) * t),
    Math.round(NOW_RGB[1] + (CLEAR_RGB[1] - NOW_RGB[1]) * t),
    Math.round(NOW_RGB[2] + (CLEAR_RGB[2] - NOW_RGB[2]) * t),
  ];
  return `rgb(${r},${g},${b})`;
}

export const WhatWouldActuallyHelpHere: React.FC = () => {
  const [source, setSource] = useState<string | null>(null);

  const { data, loading } = useAgenticText(
    Boolean(source),
    () => storyAPI.agenticHelp({ source }),
    [source]
  );

  return (
    <div className="text-center">
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
        {SOURCES.map((s) => {
          const active = source === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSource(s.key)}
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
              {s.label}
            </button>
          );
        })}
      </div>

      {source && (
        <div className="mx-auto mt-8 max-w-lg">
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(234,88,12,0.12)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: loading ? '0%' : `${data?.share || 0}%`,
                background: 'linear-gradient(90deg, #ea580c, #f59e0b)',
              }}
            />
          </div>
          <div
            className="mt-6 text-xl leading-relaxed transition-opacity duration-700"
            style={{ fontFamily: SERIF, color: TEXT, opacity: loading ? 0 : 1 }}
          >
            {data?.paragraph}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <div style={{ width: 88, height: 56, backgroundColor: skyColor(0), borderRadius: '10px' }} />
              <div className="mt-2 text-sm font-medium" style={{ color: MUTED }}>now</div>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="transition-colors duration-[1200ms] ease-out"
                style={{
                  width: 88,
                  height: 56,
                  backgroundColor: skyColor(loading ? 0 : Math.min(1, (data?.share || 0) / 40)),
                  borderRadius: '10px',
                }}
              />
              <div className="mt-2 text-sm font-medium" style={{ color: MUTED }}>if this were fixed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
