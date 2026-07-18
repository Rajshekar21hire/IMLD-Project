import React, { useEffect, useRef, useState } from 'react';
import { Chart, ChartConfiguration, Plugin, registerables } from 'chart.js';

Chart.register(...registerables);

function shiftHexColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;

  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const read = (index: number) => parseInt(normalized.slice(index, index + 2), 16);
  const write = (value: number) => clamp(value).toString(16).padStart(2, '0');

  return `#${write(read(0) + amount)}${write(read(2) + amount)}${write(read(4) + amount)}`;
}

const threeDBarPlugin: Plugin<'bar'> = {
  id: 'threeDBarPlugin',
  afterDatasetDraw(chart, args) {
    const dataset = chart.data.datasets[args.index];
    const meta = chart.getDatasetMeta(args.index);
    const colors = dataset.backgroundColor;
    const ctx = chart.ctx;

    meta.data.forEach((element, index) => {
      const fill = Array.isArray(colors) ? colors[index] : colors;
      if (typeof fill !== 'string') return;

      const bar = element as unknown as {
        x: number;
        y: number;
        base: number;
        width: number;
      };

      const left = bar.x - bar.width / 2;
      const right = bar.x + bar.width / 2;
      const top = Math.min(bar.y, bar.base);
      const bottom = Math.max(bar.y, bar.base);
      const depth = Math.min(12, Math.max(6, bar.width * 0.28));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left + depth, top - depth);
      ctx.lineTo(right + depth, top - depth);
      ctx.lineTo(right, top);
      ctx.closePath();
      ctx.fillStyle = shiftHexColor(fill, 50);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(right, top);
      ctx.lineTo(right + depth, top - depth);
      ctx.lineTo(right + depth, bottom - depth);
      ctx.lineTo(right, bottom);
      ctx.closePath();
      ctx.fillStyle = shiftHexColor(fill, -60);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(left + Math.max(2, bar.width * 0.18), top + 8);
      ctx.lineTo(left + Math.max(4, bar.width * 0.32), top + 4);
      ctx.lineTo(left + Math.max(4, bar.width * 0.32), bottom - 6);
      ctx.lineTo(left + Math.max(2, bar.width * 0.18), bottom - 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fill();
      ctx.restore();
    });
  },
};

const bestAirQualityData = [
  { city: 'Plovdiv', value: 2 },
  { city: 'Zurich', value: 7.7 },
  { city: 'Hobart', value: 9.2 },
  { city: 'Vitoria', value: 12.2 },
  { city: 'Launceston', value: 12.5 },
];

const worstAirQualityData = [
  { city: 'Ghaziabad', value: 158 },
  { city: 'Dhaka', value: 162 },
  { city: 'New Delhi', value: 168 },
  { city: 'Delhi', value: 172 },
  { city: 'Lahore', value: 195 },
];

type HoverTrend = 'increase' | 'decrease' | null;

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    padding: {
      top: 22,
      right: 18,
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => `${context.raw} µg/m³`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: 'rgb(100, 116, 139)', font: { size: 11 } },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgb(226, 232, 240)' },
      ticks: { color: 'rgb(148, 163, 184)', font: { size: 11 } },
      border: { color: 'rgb(226, 232, 240)' },
    },
  },
};

export const BestWorstAirQualitySection: React.FC = () => {
  const [bestHoverTrend, setBestHoverTrend] = useState<HoverTrend>(null);
  const [worstHoverTrend, setWorstHoverTrend] = useState<HoverTrend>(null);
  const bestCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const worstCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bestChartRef = useRef<Chart<'bar'> | null>(null);
  const worstChartRef = useRef<Chart<'bar'> | null>(null);
  const bestPointerXRef = useRef<number | null>(null);
  const worstPointerXRef = useRef<number | null>(null);

  useEffect(() => {
    const buildOptions = () => ({
      ...commonOptions,
      interaction: {
        mode: 'nearest' as const,
        intersect: true,
      },
    });

    if (bestCanvasRef.current) {
      const bestConfig: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: bestAirQualityData.map((item) => item.city),
          datasets: [
            {
              data: bestAirQualityData.map((item) => item.value),
              backgroundColor: [
                '#15803d',
                '#22c55e',
                '#4ade80',
                '#86efac',
                '#bbf7d0',
              ],
              borderRadius: 2,
              borderSkipped: false,
              maxBarThickness: 34,
              categoryPercentage: 0.7,
              barPercentage: 0.72,
            },
          ],
        },
        options: buildOptions(),
        plugins: [threeDBarPlugin],
      };

      bestChartRef.current = new Chart(bestCanvasRef.current, bestConfig);
    }

    if (worstCanvasRef.current) {
      const worstConfig: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: worstAirQualityData.map((item) => item.city),
          datasets: [
            {
              data: worstAirQualityData.map((item) => item.value),
              backgroundColor: [
                '#fecaca',
                '#fca5a5',
                '#f87171',
                '#ef4444',
                '#b91c1c',
              ],
              borderRadius: 2,
              borderSkipped: false,
              maxBarThickness: 34,
              categoryPercentage: 0.7,
              barPercentage: 0.72,
            },
          ],
        },
        options: buildOptions(),
        plugins: [threeDBarPlugin],
      };

      worstChartRef.current = new Chart(worstCanvasRef.current, worstConfig);
    }

    return () => {
      bestChartRef.current?.destroy();
      worstChartRef.current?.destroy();
    };
  }, []);

  const updateHoverTrend = (
    event: React.MouseEvent<HTMLDivElement>,
    pointerXRef: React.MutableRefObject<number | null>,
    setHoverTrend: React.Dispatch<React.SetStateAction<HoverTrend>>
  ) => {
    const { left } = event.currentTarget.getBoundingClientRect();
    const currentX = event.clientX - left;
    const previousX = pointerXRef.current;

    if (previousX !== null) {
      const delta = currentX - previousX;
      if (Math.abs(delta) >= 3) {
        setHoverTrend(delta > 0 ? 'increase' : 'decrease');
      }
    }

    pointerXRef.current = currentX;
  };

  const clearHoverTrend = (
    pointerXRef: React.MutableRefObject<number | null>,
    setHoverTrend: React.Dispatch<React.SetStateAction<HoverTrend>>
  ) => {
    pointerXRef.current = null;
    setHoverTrend(null);
  };

  return (
    <section className="bg-transparent py-16 px-6 md:px-12">
      <div className="mx-auto max-w-[90rem] text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#0C447C] font-bold">
          Why These Five
        </p>
        <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">
          The <span style={{ color: '#ba324f' }}>Worst-Affected </span> Places, By The Numbers
        </h2>
        <p className="mt-5 w-full text-center text-base leading-relaxed text-slate-700">
          To deep-dive responsibly, we first had to establish which cities actually
          rank as the best and worst by air quality index. These five share a
          structural cluster of causes, fossil-fuel transport, coal-fired brick
          kilns, and industrial emissions, amplified by flat basin geography that
          traps pollutants in winter inversions, and left unchecked by weak
          cross-boundary governance.
        </p>

        <br/>
          
        <h3 className="text-4xl font-black text-slate-950">Best vs worst air quality</h3>
            <br />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
                <p className="text-sm font-semibold text-slate-700">Best Air Quality</p>
                <div
                  className="relative mt-3 h-[280px] md:h-[320px]"
                  onMouseMove={(event) => updateHoverTrend(event, bestPointerXRef, setBestHoverTrend)}
                  onMouseLeave={() => clearHoverTrend(bestPointerXRef, setBestHoverTrend)}
                >
                  {bestHoverTrend && (
                    <div
                      className={`pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] shadow-sm ${
                        bestHoverTrend === 'increase'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      <span>{bestHoverTrend === 'increase' ? '->' : '<-'}</span>
                      <span>PM2.5 Getting {bestHoverTrend === 'increase' ? 'Increase' : 'Decrease'}</span>
                    </div>
                  )}
                  <canvas
                    ref={bestCanvasRef}
                    role="img"
                    aria-label="Vertical 3D bar chart showing best air quality cities and PM2.5 values"
                  />
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
                <p className="text-sm font-semibold text-slate-700">Worst Air Quality</p>
                <div
                  className="relative mt-3 h-[280px] md:h-[320px]"
                  onMouseMove={(event) => updateHoverTrend(event, worstPointerXRef, setWorstHoverTrend)}
                  onMouseLeave={() => clearHoverTrend(worstPointerXRef, setWorstHoverTrend)}
                >
                  {worstHoverTrend && (
                    <div
                      className={`pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] shadow-sm ${
                        worstHoverTrend === 'increase'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      <span>{worstHoverTrend === 'increase' ? '->' : '<-'}</span>
                      <span>PM2.5 Getting {worstHoverTrend === 'increase' ? 'Increase' : 'Decrease'}</span>
                    </div>
                  )}
                  <canvas
                    ref={worstCanvasRef}
                    role="img"
                    aria-label="Vertical 3D bar chart showing worst air quality cities and PM2.5 values"
                  />
                </div>
              </article>
            </div>
            <br />
            <p className="text-center text-sm text-slate-500">Based on average PM2.5, 2015-2026.</p>
      </div>
    </section>
  );
};
