import React, { useEffect, useMemo, useRef, useState } from 'react';
import { storyAPI } from '../services/api';
import {
  AGENTIC_SOLUTIONS,
  AGENTIC_TIERED_CITIES,
  AGENTIC_TIER_LABELS,
  AgenticCityTier,
  averageOf,
  getTieredCity,
} from '../data/agenticMechanismData';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';
const TIERS: AgenticCityTier[] = ['worst', 'medium', 'best'];

const CANVAS_W = 340;
const CANVAS_H = 260;
const GROUND_Y = CANVAS_H - 46;
const PARTICLE_SCALE = 2.1;

type Particle = { x: number; y: number; vy: number; wobble: number; alpha: number; dying: boolean };

// Same muted six-band palette as InversionChamber.tsx, reused here so a given air quality
// severity always reads as the same colour everywhere in the Agentic AI section.
function getBand(value: number) {
  if (value <= 50) return { label: 'Good', color: '#7bc9b8' };
  if (value <= 100) return { label: 'Moderate', color: '#e0be6b' };
  if (value <= 150) return { label: 'Unhealthy for sensitive groups', color: '#e3a374' };
  if (value <= 200) return { label: 'Unhealthy', color: '#dd8f8f' };
  if (value <= 300) return { label: 'Very unhealthy', color: '#c99bd6' };
  return { label: 'Hazardous', color: '#d992a3' };
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const FALLBACK_EXPLAIN = {
  how_to_use: 'Pick a city and some solutions, then drag the years slider to see the projection.',
  description:
    'This projects how a city\'s air might change if the selected solutions stayed in place for the chosen number of years - effects build up gradually, not instantly.',
};

function fallbackStoryText(city: string, years: number, startBand: string, endBand: string) {
  if (startBand === endBand) {
    return `Even after ${years} years, ${city}'s air is projected to stay in the same "${startBand.toLowerCase()}" range - real change would need more solutions in place at once.`;
  }
  return `Over ${years} years, ${city}'s air is projected to move from "${startBand.toLowerCase()}" to "${endBand.toLowerCase()}" - a shift people there would genuinely feel, day to day.`;
}

export const CitySimulation: React.FC = () => {
  const defaultCity = AGENTIC_TIERED_CITIES.find((c) => c.tier === 'worst')?.city || AGENTIC_TIERED_CITIES[0].city;
  const [city, setCity] = useState(defaultCity);
  const [solutionIds, setSolutionIds] = useState<string[]>([]);
  const [years, setYears] = useState(10);
  const [interacted, setInteracted] = useState(false);
  const [explain, setExplain] = useState(FALLBACK_EXPLAIN);
  const [story, setStory] = useState('');
  const [storyStatus, setStoryStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const requestId = useRef(0);

  const tieredCity = useMemo(() => getTieredCity(city), [city]);
  const currentPm25 = useMemo(() => averageOf(tieredCity.monthly), [tieredCity]);

  const selectedSolutions = AGENTIC_SOLUTIONS.filter((s) => solutionIds.includes(s.id));
  const combinedShare = Math.min(0.85, selectedSolutions.reduce((s, sol) => s + sol.pm25ReductionShare, 0));
  const avgYearsToNotice = selectedSolutions.length
    ? selectedSolutions.reduce((s, sol) => s + sol.yearsToNotice, 0) / selectedSolutions.length
    : 6;

  // Saturating curve: reductions phase in gradually and taper off, rather than hitting the full
  // share instantly or extrapolating linearly past what's realistic over decades.
  const appliedFraction = combinedShare * (1 - Math.exp(-years / avgYearsToNotice));
  const projectedPm25 = currentPm25 * (1 - appliedFraction);

  const startBand = getBand(currentPm25);
  const endBand = getBand(projectedPm25);

  const targetConcentrationRef = useRef(currentPm25);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

  // Reset the live scene back to "today" whenever the city changes.
  useEffect(() => {
    targetConcentrationRef.current = currentPm25;
    setInteracted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  // Once the user has touched the controls, the scene tracks the projected concentration live.
  useEffect(() => {
    targetConcentrationRef.current = interacted ? projectedPm25 : currentPm25;
  }, [interacted, projectedPm25, currentPm25]);

  useEffect(() => {
    let cancelled = false;
    storyAPI
      .agenticExplain({
        section: 'city-simulation',
        context:
          'Pick a city (from worst/medium/best air-quality tiers), toggle any of four real interventions, then drag a years-from-now slider (1 to 50) to watch particles in a cityscape thin out or thicken live, landing on a projected air-quality band.',
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

  useEffect(() => {
    if (!interacted) return;
    const myId = ++requestId.current;
    setStoryStatus('loading');
    setStory(fallbackStoryText(city, years, startBand.label, endBand.label));
    storyAPI
      .agenticSimulationStory({
        city,
        years,
        solution_labels: selectedSolutions.map((s) => s.label),
        start_band: startBand.label,
        end_band: endBand.label,
      })
      .then((res) => {
        if (requestId.current !== myId) return;
        if (res.data?.success && res.data.data?.text) {
          setStory(res.data.data.text);
          setStoryStatus('done');
        } else {
          setStoryStatus('idle');
        }
      })
      .catch(() => {
        if (requestId.current !== myId) return;
        setStoryStatus('idle');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interacted, city, years, solutionIds]);

  // Canvas + particle system, modeled directly on InversionChamber.tsx: particles spawn/die
  // toward a live target count, drifting through a small cityscape rather than a physical lid.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const step = () => {
      const concentration = targetConcentrationRef.current;
      const targetCount = Math.min(650, Math.max(4, Math.round(concentration * PARTICLE_SCALE)));
      const band = getBand(Math.min(500, concentration));

      let alive = particlesRef.current.filter((p) => !p.dying || p.alpha > 0.02);
      const aliveCount = alive.filter((p) => !p.dying).length;

      if (aliveCount < targetCount) {
        const toSpawn = Math.min(3, targetCount - aliveCount);
        for (let i = 0; i < toSpawn; i += 1) {
          alive.push({
            x: Math.random() * CANVAS_W,
            y: GROUND_Y + Math.random() * 20,
            vy: -(0.4 + Math.random() * 0.5),
            wobble: Math.random() * Math.PI * 2,
            alpha: 0.3 + Math.random() * 0.35,
            dying: false,
          });
        }
      } else if (aliveCount > targetCount) {
        let toKill = Math.min(4, aliveCount - targetCount);
        for (let i = 0; i < alive.length && toKill > 0; i += 1) {
          if (!alive[i].dying) {
            alive[i].dying = true;
            toKill -= 1;
          }
        }
      }

      alive = alive.map((p) => {
        let { x, y, vy, wobble, alpha } = p;
        y += vy;
        wobble += 0.02;
        x += Math.sin(wobble) * 0.4;
        if (y < 6) {
          y = GROUND_Y + Math.random() * 20;
          x = Math.random() * CANVAS_W;
        }
        if (p.dying) alpha -= 0.03;
        return { ...p, x, y, vy, wobble, alpha };
      });

      particlesRef.current = alive.filter((p) => p.alpha > 0.01);

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      sky.addColorStop(0, '#f8fafc');
      sky.addColorStop(1, hexToRgba(band.color, 0.16));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

      // Soft glowing particles rather than flat dots - shadowBlur gives each one a gentle halo.
      ctx.shadowColor = hexToRgba(band.color, 0.9);
      ctx.shadowBlur = 5;
      particlesRef.current.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(band.color, p.alpha * 0.9);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Skyline silhouette with a subtle vertical gradient per building and a few lit windows,
      // instead of one flat silhouette colour.
      const buildings = [
        { x: 14, w: 34, h: 60 },
        { x: 54, w: 24, h: 90 },
        { x: 84, w: 30, h: 46 },
        { x: 176, w: 26, h: 76 },
        { x: 208, w: 36, h: 52 },
        { x: 252, w: 22, h: 96 },
        { x: 280, w: 32, h: 58 },
      ];
      buildings.forEach((b, bi) => {
        const top = GROUND_Y - b.h;
        const bGrad = ctx.createLinearGradient(0, top, 0, GROUND_Y);
        bGrad.addColorStop(0, 'rgba(23,50,74,0.24)');
        bGrad.addColorStop(1, 'rgba(23,50,74,0.14)');
        ctx.fillStyle = bGrad;
        ctx.fillRect(b.x, top, b.w, b.h);

        const rows = Math.max(2, Math.floor(b.h / 16));
        const cols = Math.max(2, Math.floor(b.w / 10));
        for (let r = 0; r < rows; r += 1) {
          for (let c = 0; c < cols; c += 1) {
            if ((r * cols + c + bi) % 3 === 0) continue;
            ctx.fillStyle = 'rgba(253, 230, 138, 0.35)';
            ctx.fillRect(b.x + 4 + c * 8, top + 6 + r * 12, 3, 4);
          }
        }
      });

      const ground = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
      ground.addColorStop(0, hexToRgba(band.color, 0.42));
      ground.addColorStop(1, hexToRgba(band.color, 0.58));
      ctx.fillStyle = ground;
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

      // Soft vignette for depth, same technique as InversionChamber's chamber glow.
      const vignette = ctx.createRadialGradient(CANVAS_W / 2, GROUND_Y * 0.55, 20, CANVAS_W / 2, GROUND_Y * 0.55, CANVAS_W * 0.85);
      vignette.addColorStop(0, 'rgba(255,255,255,0)');
      vignette.addColorStop(1, 'rgba(15,36,55,0.10)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div>
      <div className="mx-auto mb-1 max-w-[72rem] text-center text-sm" style={{ color: MUTED }}>
        {explain.how_to_use}
      </div>
      <div className="mx-auto mb-6 max-w-[72rem] text-center text-sm" style={{ color: MUTED }}>
        {explain.description}
      </div>

      <div className="flex flex-wrap items-start justify-center gap-6">
        {TIERS.map((tier) => (
          <div key={tier} className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
              {AGENTIC_TIER_LABELS[tier]}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {AGENTIC_TIERED_CITIES.filter((c) => c.tier === tier).map((c) => {
                const active = c.city === city;
                return (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => setCity(c.city)}
                    className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: active ? '#d97706' : 'rgba(255,255,255,0.7)',
                      color: active ? '#fff' : MUTED,
                      border: `1.5px solid ${active ? '#d97706' : 'var(--ss-border)'}`,
                    }}
                    aria-pressed={active}
                  >
                    {c.city}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-center">
        <div
          className="shrink-0 self-center overflow-hidden rounded-2xl border md:self-start"
          style={{ borderColor: 'var(--ss-border)', boxShadow: '0 8px 24px rgba(15,36,55,0.1)' }}
        >
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: 'block' }} />
        </div>

        <div className="flex w-full max-w-[48rem] flex-col gap-6">
          <div>
            <div className="text-sm font-semibold" style={{ color: TEXT }}>
              Solutions to try
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {AGENTIC_SOLUTIONS.map((s) => {
                const active = solutionIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSolutionIds((cur) => (active ? cur.filter((id) => id !== s.id) : [...cur, s.id]));
                      setInteracted(true);
                    }}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: active ? '#d97706' : 'rgba(255,255,255,0.7)',
                      color: active ? '#fff' : MUTED,
                      border: `1.5px solid ${active ? '#d97706' : 'var(--ss-border)'}`,
                    }}
                    aria-pressed={active}
                  >
                    {s.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="sim-years" className="flex items-center justify-between text-sm font-semibold" style={{ color: TEXT }}>
              <span>Years from now</span>
              <span style={{ color: '#d97706' }}>{years}</span>
            </label>
            <input
              id="sim-years"
              type="range"
              min={1}
              max={50}
              step={1}
              value={years}
              onChange={(e) => {
                setYears(Number(e.target.value));
                setInteracted(true);
              }}
              className="sim-slider mt-2 w-full"
              style={{ background: `linear-gradient(90deg, #d97706 0%, #d97706 ${((years - 1) / 49) * 100}%, rgba(148,163,184,0.3) ${((years - 1) / 49) * 100}%, rgba(148,163,184,0.3) 100%)` }}
            />
          </div>

          {interacted && (
            <div
              className="rounded-2xl px-5 py-4 text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.86)', border: '1px solid var(--ss-border)' }}
            >
              <div className="text-sm" style={{ color: MUTED }}>
                After {years} years, projected air
              </div>
              <div className="text-2xl font-extrabold" style={{ color: endBand.color }}>
                {endBand.label}
              </div>
              <div className="mt-1 text-xs" style={{ color: MUTED }}>
                about {Math.round(projectedPm25)} µg/m³, down from {Math.round(currentPm25)} today
              </div>
              <div
                className="mt-3 text-sm leading-relaxed transition-opacity duration-300"
                style={{ opacity: storyStatus === 'loading' ? 0.5 : 1, color: TEXT }}
              >
                {story}
              </div>
              {storyStatus === 'done' && (
                <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#b8b2a6' }}>
                  Ollama generated
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .sim-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          outline: none;
        }
        .sim-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #d97706;
          box-shadow: 0 2px 8px rgba(15,36,55,0.25);
          cursor: pointer;
        }
        .sim-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border: none;
          border-radius: 9999px;
          background: #d97706;
          box-shadow: 0 2px 8px rgba(15,36,55,0.25);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};
