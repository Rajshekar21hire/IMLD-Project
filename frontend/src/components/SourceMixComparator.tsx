import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useOllamaText } from './useOllamaText';
import { OllamaCommentaryBody } from './OllamaCommentary';

export type CauseKey = 'transport' | 'kilns' | 'industry' | 'crop' | 'other';

export type CityMix = { id: string; name: string; pm25: number } & Record<CauseKey, number>;

// Illustrative splits, grounded in the causes/emphasis already established for these five
// cities in RootCauseExplorerSection (same transport/kilns/industry/crop drivers), normalized
// to percentages of each city's own PM2.5 so every row sums to 100.
export const CITIES: CityMix[] = [
  { id: 'lahore', name: 'Lahore', pm25: 150, transport: 35, kilns: 17, industry: 28, crop: 8, other: 12 },
  { id: 'delhi', name: 'Delhi', pm25: 170, transport: 28, kilns: 12, industry: 14, crop: 34, other: 12 },
  { id: 'newdelhi', name: 'New Delhi', pm25: 165, transport: 26, kilns: 13, industry: 15, crop: 32, other: 14 },
  { id: 'dhaka', name: 'Dhaka', pm25: 130, transport: 15, kilns: 21, industry: 28, crop: 10, other: 26 },
  { id: 'ghaziabad', name: 'Ghaziabad', pm25: 158, transport: 24, kilns: 15, industry: 20, crop: 27, other: 14 },
];

const SEGMENTS: { key: CauseKey; label: string; color: string }[] = [
  { key: 'transport', label: 'Transport', color: '#3b82f6' },
  { key: 'kilns', label: 'Brick kilns', color: '#6366f1' },
  { key: 'industry', label: 'Industry & power', color: '#a855f7' },
  { key: 'crop', label: 'Crop burning', color: '#f59e0b' },
  { key: 'other', label: 'Other', color: '#94a3b8' },
];

const FALLBACK =
  'The five cities share the same short list of causes; what differs from one to the next is which cause carries the largest share, not which causes exist.';

function buildPrompt(city: CityMix): string {
  const breakdown = SEGMENTS.map((s) => `${s.label}: ${city[s.key]}%`).join(', ');
  return `You are an analyst writing plain, structural commentary for a data-journalism piece on South Asian air pollution. The reader just selected "${city.name}" (PM2.5 ${city.pm25} µg/m³) in a chart comparing five cities on the same five root causes of pollution: Transport, Brick kilns, Industry & power, Crop burning, and Other.

${city.name}'s breakdown: ${breakdown}.

Write 2 to 3 sentences of direct, structural analyst commentary explaining what this city's specific mix reveals, in the context that all five cities share the same causes in different proportions. No bullet points, no fluff, no headings. Return only the commentary text.`;
}

export const SourceMixComparator: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeId = hoveredId || selectedId;
  const selectedCity = useMemo(() => CITIES.find((c) => c.id === selectedId) || null, [selectedId]);

  const prompt = selectedCity ? buildPrompt(selectedCity) : null;
  const { text, status } = useOllamaText(prompt, FALLBACK);

  // Convert each cause's share (%) to its absolute µg/m³ contribution so bar height reflects
  // both the city's total PM2.5 and its internal mix - not just a flat 100%-stacked share.
  const chartData = useMemo(
    () =>
      CITIES.map((city) => ({
        ...city,
        transport: (city.transport / 100) * city.pm25,
        kilns: (city.kilns / 100) * city.pm25,
        industry: (city.industry / 100) * city.pm25,
        crop: (city.crop / 100) * city.pm25,
        other: (city.other / 100) * city.pm25,
      })),
    []
  );

  return (
    <div className="rounded-3xl border border-indigo-400/40 bg-gradient-to-br from-blue-600/15 via-indigo-500/10 to-purple-600/15 p-6 shadow-xl shadow-indigo-500/10 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Source mix</p>
      <h4 className="mt-2 text-2xl font-extrabold md:text-3xl" style={{ color: '#1e3a5f' }}>
        Same ingredients, different proportions
      </h4>
      <p className="mt-2 text-base leading-relaxed text-slate-600">
        Click a city to see how its PM2.5 breaks down across the same five root causes shared by all five.
      </p>

      <div className="mt-6 h-96 w-full rounded-xl border border-blue-100 bg-white/70 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
            <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#475569' }} />
            <YAxis
              tick={{ fontSize: 13, fill: '#475569' }}
              label={{ value: 'µg/m³ PM2.5', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, borderColor: '#c7d2fe', fontSize: 14 }}
              formatter={(value: number, name: string) => [`${value.toFixed(0)} µg/m³`, name]}
              labelFormatter={(label) => `City: ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            {SEGMENTS.map((seg, segIndex) => (
              <Bar key={seg.key} dataKey={seg.key} stackId="mix" name={seg.label} radius={segIndex === SEGMENTS.length - 1 ? [10, 10, 0, 0] : undefined}>
                {chartData.map((city) => (
                  <Cell
                    key={city.id}
                    fill={seg.color}
                    fillOpacity={!activeId || activeId === city.id ? 1 : 0.25}
                    cursor="pointer"
                    onClick={() => setSelectedId((current) => (current === city.id ? null : city.id))}
                    onMouseEnter={() => setHoveredId(city.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 border border-emerald-200">
          Generated by Ollama
        </span>
        {selectedCity && <span className="text-slate-500">for {selectedCity.name}</span>}
      </div>

      <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
        <h6 className="text-base font-bold" style={{ color: '#1e3a5f' }}>
          Analyst read
        </h6>
        <div className="mt-2">
          {!selectedCity && (
            <p className="text-base leading-relaxed text-slate-500">Select a city above to generate commentary on its source mix.</p>
          )}
          {selectedCity && <OllamaCommentaryBody status={status} text={text} />}
        </div>
      </div>
    </div>
  );
};
