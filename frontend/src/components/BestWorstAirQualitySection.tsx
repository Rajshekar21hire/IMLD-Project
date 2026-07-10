import React, { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

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

const commonOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
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
      grid: { color: 'rgb(226, 232, 240)' },
      ticks: { color: 'rgb(148, 163, 184)', font: { size: 11 } },
      border: { color: 'rgb(226, 232, 240)' },
    },
    y: {
      grid: { display: false },
      ticks: { color: 'rgb(100, 116, 139)', font: { size: 11 } },
      border: { display: false },
    },
  },
};

export const BestWorstAirQualitySection: React.FC = () => {
  const bestCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const worstCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bestChartRef = useRef<Chart<'bar'> | null>(null);
  const worstChartRef = useRef<Chart<'bar'> | null>(null);

  useEffect(() => {
    if (bestCanvasRef.current) {
      const bestConfig: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: bestAirQualityData.map((item) => item.city),
          datasets: [
            {
              data: bestAirQualityData.map((item) => item.value),
              backgroundColor: 'rgb(22, 163, 74)',
              borderRadius: 4,
              borderSkipped: false,
              maxBarThickness: 20,
            },
          ],
        },
        options: commonOptions,
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
              backgroundColor: 'rgb(220, 38, 38)',
              borderRadius: 4,
              borderSkipped: false,
              maxBarThickness: 20,
            },
          ],
        },
        options: commonOptions,
      };

      worstChartRef.current = new Chart(worstCanvasRef.current, worstConfig);
    }

    return () => {
      bestChartRef.current?.destroy();
      worstChartRef.current?.destroy();
    };
  }, []);

  return (
    <section className="bg-white py-16 px-6 md:px-12">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-sky-700 font-bold">
          Why These Five
        </p>
        <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">
          The <span style={{ color: '#ba324f' }}>Worst-Affected </span> Places, By The Numbers
        </h2>
        <p className="mt-4 w-full text-justify text-base leading-relaxed text-slate-700">
          To deep-dive responsibly, we first had to establish which cities actually
          rank as the best and worst by air quality index. These five share a
          structural cluster of causes, fossil-fuel transport, coal-fired brick
          kilns, and industrial emissions, amplified by flat basin geography that
          traps pollutants in winter inversions, and left unchecked by weak
          cross-boundary governance.
        </p>

        <br/>
          
        <h3 className="text-2xl font-black text-slate-950 text-3xl">Best vs worst air quality</h3>
            <br />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
                <p className="text-sm font-semibold text-slate-700">Best air quality</p>
                 <br />
                <div className="mt-3 h-[200px]">
                  <canvas
                    ref={bestCanvasRef}
                    role="img"
                    aria-label="Horizontal bar chart showing best air quality cities and PM2.5 values"
                  />
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
                <p className="text-sm font-semibold text-slate-700">Worst air quality</p>
                <div className="mt-3 h-[200px]">
                  <canvas
                    ref={worstCanvasRef}
                    role="img"
                    aria-label="Horizontal bar chart showing worst air quality cities and PM2.5 values"
                  />
                </div>
              </article>
            </div>
            <br />
            <p className="text-sm text-slate-500">Based on average PM2.5, 2015-2026.</p>
      </div>
    </section>
  );
};
