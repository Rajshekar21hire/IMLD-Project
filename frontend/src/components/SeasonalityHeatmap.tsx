import React, { useMemo, useState } from 'react';
import {
  AGENTIC_MECHANISM_CITIES,
  CITY_MONTHLY_PM25,
  MechanismCity,
  MONTH_LABELS,
  WHO_24H_GUIDELINE_PM25,
} from '../data/agenticMechanismData';
import { useAgenticOllamaCaption } from './useAgenticOllamaCaption';
import { AgenticCaption } from './AgenticCaption';

const TEXT = '#232323';
const MUTED = '#8b8780';

// Reorder to a "meteorological" year so the Oct-Jan peak season sits as one contiguous
// band in the middle of the chart instead of wrapping around the calendar-year edge.
const DISPLAY_ORDER = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const PEAK_BAND = ['Oct', 'Nov', 'Dec', 'Jan'];

// Layout is expressed in percent units directly (of the container's width/height), and shared
// by both the SVG cell grid and the HTML label overlays so the two always line up.
const VB_W = 100;
const ANNOT_H = 9;
const HEADER_H = 7;
const GRID_H = 44;
const VB_H = ANNOT_H + HEADER_H + GRID_H;
const LABEL_W = 18;
const COL_W = (VB_W - LABEL_W) / 12;
const ROW_H = GRID_H / AGENTIC_MECHANISM_CITIES.length;

const pctX = (units: number) => (units / VB_W) * 100;
const pctY = (units: number) => (units / VB_H) * 100;

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function mix(hexA: string, hexB: string, t: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const c = (k: 'r' | 'g' | 'b') => Math.round(a[k] + (b[k] - a[k]) * t);
  return `rgb(${c('r')}, ${c('g')}, ${c('b')})`;
}

const MAX_VALUE = Math.max(...Object.values(CITY_MONTHLY_PM25).flat());

// Diverging-to-sequential scale anchored at the WHO 24-hour guideline: cool/pale below it,
// escalating yellow -> orange -> red above it.
function colorForValue(value: number) {
  if (value <= WHO_24H_GUIDELINE_PM25) {
    const t = Math.max(0, Math.min(1, value / WHO_24H_GUIDELINE_PM25));
    return mix('#f0f9ff', '#38bdf8', t);
  }
  const t = Math.max(0, Math.min(1, (value - WHO_24H_GUIDELINE_PM25) / (MAX_VALUE - WHO_24H_GUIDELINE_PM25)));
  return t < 0.5 ? mix('#fef9c3', '#f97316', t / 0.5) : mix('#f97316', '#b91c1c', (t - 0.5) / 0.5);
}

const FALLBACK_CAPTION =
  "Follow the colour across any row and it heats up the same way every winter - orange sliding into deep red right as crop burning and cold, still air arrive together. Almost every cell here sits above what the WHO calls safe.";

export const SeasonalityHeatmap: React.FC = () => {
  const [hovered, setHovered] = useState<{ city: MechanismCity; month: string } | null>(null);

  const userMessage = useMemo(
    () =>
      `Chart type: month by city heatmap of PM2.5, colour anchored at the WHO 24-hour guideline of ${WHO_24H_GUIDELINE_PM25} µg/m³. Data: ${JSON.stringify(
        CITY_MONTHLY_PM25
      )}. Nearly every month in every city sits above the guideline, and Oct-Jan is worst everywhere.`,
    []
  );
  const { text: caption, status } = useAgenticOllamaCaption(userMessage, FALLBACK_CAPTION);

  const bandStartIdx = DISPLAY_ORDER.indexOf(PEAK_BAND[0]);
  const bandLeft = LABEL_W + bandStartIdx * COL_W;
  const bandWidth = PEAK_BAND.length * COL_W;

  return (
    <div>
      <div className="relative mx-auto" style={{ maxWidth: '920px', aspectRatio: `${VB_W} / ${VB_H}` }}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <rect
            x={bandLeft}
            y={ANNOT_H - 1}
            width={bandWidth}
            height={VB_H - ANNOT_H + 1}
            fill="rgba(217,119,6,0.07)"
            stroke="rgba(217,119,6,0.4)"
            strokeDasharray="1.2 1"
            rx={1.5}
          />

          {AGENTIC_MECHANISM_CITIES.map((city, rowIdx) =>
            DISPLAY_ORDER.map((month, colIdx) => {
              const monthIdx = MONTH_LABELS.indexOf(month);
              const value = CITY_MONTHLY_PM25[city][monthIdx];
              const isHovered = hovered?.city === city && hovered?.month === month;
              return (
                <rect
                  key={`${city}-${month}`}
                  x={LABEL_W + colIdx * COL_W + 0.25}
                  y={ANNOT_H + HEADER_H + rowIdx * ROW_H + 0.25}
                  width={COL_W - 0.5}
                  height={ROW_H - 0.5}
                  rx={0.6}
                  fill={colorForValue(value)}
                  stroke={isHovered ? '#0f172a' : 'transparent'}
                  strokeWidth={isHovered ? 0.5 : 0}
                />
              );
            })
          )}
        </svg>

        <div
          className="absolute flex items-end justify-center px-1 text-center text-[10px] font-bold uppercase leading-tight"
          style={{
            top: 0,
            left: `${pctX(bandLeft)}%`,
            width: `${pctX(bandWidth)}%`,
            height: `${pctY(ANNOT_H)}%`,
            color: '#b45309',
            letterSpacing: '0.04em',
          }}
        >
          Crop-burning &amp; inversion season
        </div>

        {DISPLAY_ORDER.map((month, colIdx) => (
          <div
            key={month}
            className="absolute flex items-center justify-center text-xs"
            style={{
              top: `${pctY(ANNOT_H)}%`,
              left: `${pctX(LABEL_W + colIdx * COL_W)}%`,
              width: `${pctX(COL_W)}%`,
              height: `${pctY(HEADER_H)}%`,
              color: MUTED,
            }}
          >
            {month}
          </div>
        ))}

        {AGENTIC_MECHANISM_CITIES.map((city, rowIdx) => (
          <div
            key={city}
            className="absolute flex items-center justify-end whitespace-nowrap pr-2 text-xs font-semibold sm:text-sm"
            style={{
              top: `${pctY(ANNOT_H + HEADER_H + rowIdx * ROW_H)}%`,
              left: 0,
              width: `${pctX(LABEL_W)}%`,
              height: `${pctY(ROW_H)}%`,
              color: TEXT,
            }}
          >
            {city}
          </div>
        ))}

        <div
          className="absolute grid"
          style={{
            top: `${pctY(ANNOT_H + HEADER_H)}%`,
            left: `${pctX(LABEL_W)}%`,
            width: `${pctX(VB_W - LABEL_W)}%`,
            height: `${pctY(GRID_H)}%`,
            gridTemplateColumns: 'repeat(12, 1fr)',
            gridTemplateRows: `repeat(${AGENTIC_MECHANISM_CITIES.length}, 1fr)`,
          }}
        >
          {AGENTIC_MECHANISM_CITIES.map((city) =>
            DISPLAY_ORDER.map((month) => {
              const monthIdx = MONTH_LABELS.indexOf(month);
              const value = CITY_MONTHLY_PM25[city][monthIdx];
              const relation = value <= WHO_24H_GUIDELINE_PM25 ? 'below' : 'above';
              return (
                <button
                  key={`${city}-${month}-btn`}
                  type="button"
                  className="focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                  onMouseEnter={() => setHovered({ city, month })}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered({ city, month })}
                  onBlur={() => setHovered(null)}
                  aria-label={`${city}, ${month}: ${value} micrograms per cubic metre PM2.5, ${relation} the WHO 24-hour guideline of ${WHO_24H_GUIDELINE_PM25}`}
                />
              );
            })
          )}
        </div>

        {hovered && (
          <div
            className="pointer-events-none absolute rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              top: '2%',
              right: '2%',
              color: TEXT,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div className="font-semibold">{hovered.city} · {hovered.month}</div>
            <div>
              {CITY_MONTHLY_PM25[hovered.city][MONTH_LABELS.indexOf(hovered.month)]} µg/m³
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 text-center text-xs" style={{ color: MUTED }}>
        Colour is anchored at the WHO 24-hour guideline ({WHO_24H_GUIDELINE_PM25} µg/m³) - pale blue is at or under it, yellow to deep red climbs above it.
      </div>

      <AgenticCaption text={caption} loading={status === 'loading'} generated={status === 'done'} />
    </div>
  );
};
