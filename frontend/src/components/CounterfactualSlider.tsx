import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DELHI_WINTER_BASELINE,
  DELHI_WINTER_FLOOR,
  DELHI_WINTER_MONTHS,
  DELHI_WINTER_STUBBLE_SHARE,
  WHO_24H_GUIDELINE_PM25,
} from '../data/agenticMechanismData';
import { useAgenticOllamaCaption } from './useAgenticOllamaCaption';
import { AgenticCaption } from './AgenticCaption';

const TEXT = '#232323';
const MUTED = '#8b8780';
const ACCENT = '#d97706';
const BASELINE_COLOR = '#94a3b8';

function adjustedValue(baseline: number, reductionFrac: number) {
  const removable = (baseline - DELHI_WINTER_FLOOR) * DELHI_WINTER_STUBBLE_SHARE * reductionFrac;
  return Math.max(DELHI_WINTER_FLOOR, baseline - removable);
}

export const CounterfactualSlider: React.FC = () => {
  const [reduction, setReduction] = useState(50);
  const reductionFrac = reduction / 100;

  const chartData = useMemo(
    () =>
      DELHI_WINTER_MONTHS.map((month, i) => ({
        month,
        baseline: DELHI_WINTER_BASELINE[i],
        adjusted: Math.round(adjustedValue(DELHI_WINTER_BASELINE[i], reductionFrac)),
      })),
    [reductionFrac]
  );

  const avgBaseline = Math.round(DELHI_WINTER_BASELINE.reduce((s, v) => s + v, 0) / DELHI_WINTER_BASELINE.length);
  const avgAdjusted = Math.round(chartData.reduce((s, d) => s + d.adjusted, 0) / chartData.length);
  const multiplesOverGuideline = Math.round((avgAdjusted / WHO_24H_GUIDELINE_PM25) * 10) / 10;

  const userMessage = useMemo(
    () =>
      `Chart type: counterfactual slider. Delhi winter PM2.5 baseline by month: ${JSON.stringify(
        DELHI_WINTER_BASELINE
      )} across ${JSON.stringify(DELHI_WINTER_MONTHS)}. At a ${reduction}% cut in stubble burning, the winter average falls from ${avgBaseline} to ${avgAdjusted} µg/m³ - still ${multiplesOverGuideline}x the WHO guideline, because traffic, industry, and thermal inversion are untouched by the slider.`,
    [reduction, avgBaseline, avgAdjusted, multiplesOverGuideline]
  );
  const fallbackCaption = `Even cutting stubble burning by ${reduction}% only pulls Delhi's winter air down to about ${avgAdjusted} µg/m³ - still deep into unhealthy territory, because traffic, industry, and the winter inversion never left.`;
  const { text: caption, status } = useAgenticOllamaCaption(userMessage, fallbackCaption);

  return (
    <div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: MUTED }} />
            <YAxis tick={{ fontSize: 12, fill: MUTED }} domain={[0, Math.ceil((Math.max(...DELHI_WINTER_BASELINE) * 1.1) / 10) * 10]} />
            <Tooltip formatter={(v: number) => [`${v} µg/m³`, undefined]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={WHO_24H_GUIDELINE_PM25} stroke="#0ea5e9" strokeDasharray="3 3" label={{ value: 'WHO guideline', position: 'insideTopRight', fontSize: 10, fill: '#0ea5e9' }} />
            <Line type="monotone" dataKey="baseline" name="Baseline (no change)" stroke={BASELINE_COLOR} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="adjusted" name="With reduction" stroke={ACCENT} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mx-auto mt-2 max-w-xl">
        <label htmlFor="stubble-reduction-slider" className="flex items-center justify-between text-sm font-semibold" style={{ color: TEXT }}>
          <span>% reduction in stubble burning</span>
          <span style={{ color: ACCENT }}>{reduction}%</span>
        </label>
        <input
          id="stubble-reduction-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={reduction}
          onChange={(e) => setReduction(Number(e.target.value))}
          aria-valuetext={`${reduction}% reduction in stubble burning`}
          className="mt-2 w-full accent-amber-600"
        />
      </div>

      <div className="mx-auto mt-4 max-w-xl rounded-2xl bg-slate-50 px-5 py-4 text-center">
        <div className="text-sm" style={{ color: MUTED }}>Winter average falls to</div>
        <div className="text-3xl font-extrabold" style={{ color: ACCENT }}>{avgAdjusted} µg/m³</div>
        <div className="mt-1 text-sm" style={{ color: MUTED }}>
          still {multiplesOverGuideline}x the WHO guideline - traffic, industry, and the inversion don't move when the slider does.
        </div>
      </div>

      <AgenticCaption text={caption} loading={status === 'loading'} generated={status === 'done'} />
    </div>
  );
};
