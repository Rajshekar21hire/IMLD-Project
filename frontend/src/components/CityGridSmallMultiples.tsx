import React, { useMemo } from 'react';
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AGENTIC_MECHANISM_CITIES,
  CITY_MONTHLY_PM25,
  MONTH_LABELS,
  WHO_24H_GUIDELINE_PM25,
  getCityMonthlySeries,
} from '../data/agenticMechanismData';
import { useAgenticOllamaCaption } from './useAgenticOllamaCaption';
import { AgenticCaption } from './AgenticCaption';

const TEXT = '#232323';
const MUTED = '#8b8780';
const LINE_COLOR = '#0ea5e9';

const FALLBACK_CAPTION =
  'Line up all five cities and the shape barely changes - a long climb into winter, a sharp fall once the monsoon arrives. Same air story, five addresses.';

const SyncTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-md" style={{ color: TEXT }}>
      <div className="font-semibold">{label}</div>
      <div>{Math.round(payload[0].value)} µg/m³</div>
    </div>
  );
};

export const CityGridSmallMultiples: React.FC = () => {
  const maxValue = useMemo(
    () => Math.max(...Object.values(CITY_MONTHLY_PM25).flat()),
    []
  );
  const domain: [number, number] = [0, Math.ceil((maxValue * 1.08) / 10) * 10];

  const userMessage = useMemo(
    () =>
      `Chart type: small-multiples of monthly PM2.5 across five cities, identical y-axis scale (0-${domain[1]} µg/m³). Data: ${JSON.stringify(
        CITY_MONTHLY_PM25
      )}. The point of showing them identically scaled is that the same seasonal shape repeats in every city.`,
    [domain]
  );
  const { text: caption, status } = useAgenticOllamaCaption(userMessage, FALLBACK_CAPTION);

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {AGENTIC_MECHANISM_CITIES.map((city) => {
          const series = getCityMonthlySeries(city);
          return (
            <div key={city} className="rounded-2xl bg-slate-50 p-3" role="group" aria-label={`${city} monthly PM2.5, ${domain[0]} to ${domain[1]} micrograms per cubic metre`}>
              <div className="mb-1.5 text-center text-sm font-semibold" style={{ color: TEXT }}>
                {city}
              </div>
              <div style={{ height: 110 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} syncId="agentic-city-grid" margin={{ top: 4, right: 6, bottom: 0, left: 6 }}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide domain={domain} />
                    <ReferenceLine y={WHO_24H_GUIDELINE_PM25} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Tooltip content={<SyncTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={LINE_COLOR}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex justify-between text-[10px]" style={{ color: MUTED }}>
                <span>{MONTH_LABELS[0]}</span>
                <span>{MONTH_LABELS[MONTH_LABELS.length - 1]}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-center text-xs" style={{ color: MUTED }}>
        Same y-axis on every chart, dashed line marks the WHO 24-hour guideline ({WHO_24H_GUIDELINE_PM25} µg/m³). Hover any month to compare it across all five cities.
      </div>

      <AgenticCaption text={caption} loading={status === 'loading'} generated={status === 'done'} />
    </div>
  );
};
