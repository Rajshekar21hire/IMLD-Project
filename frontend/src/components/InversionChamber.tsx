import React, { useCallback, useEffect, useRef, useState } from 'react';
import { storyAPI } from '../services/api';

const CANVAS_W = 320;
const CANVAS_H = 520;
const GROUND_MARGIN = 18;
const SKY_MARGIN = 14;
const MAX_HEIGHT_M = 2100;

type Particle = {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  alpha: number;
  dying: boolean;
};

const heightToY = (heightM: number) => {
  const usable = CANVAS_H - GROUND_MARGIN - SKY_MARGIN;
  const t = Math.min(1, Math.max(0, heightM / MAX_HEIGHT_M));
  return CANVAS_H - GROUND_MARGIN - t * usable;
};

const getBand = (value: number) => {
  if (value <= 50) return { label: 'Good', color: '#34d399' };
  if (value <= 100) return { label: 'Moderate', color: '#facc15' };
  if (value <= 150) return { label: 'Unhealthy for sensitive groups', color: '#fb923c' };
  if (value <= 200) return { label: 'Unhealthy', color: '#f87171' };
  if (value <= 300) return { label: 'Very unhealthy', color: '#c084fc' };
  return { label: 'Hazardous', color: '#e11d48' };
};

const PRESETS = [
  { key: 'monsoon', label: 'Monsoon afternoon', emissions: 55, height: 1800 },
  { key: 'october', label: 'October evening', emissions: 62, height: 700 },
  { key: 'january', label: 'January morning', emissions: 78, height: 160 },
] as const;

export const InversionChamber: React.FC = () => {
  const [emissions, setEmissions] = useState(50);
  const [mixingHeight, setMixingHeight] = useState(900);
  const [hasSeenLowLid, setHasSeenLowLid] = useState(false);

  const [howToUse, setHowToUse] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const fetchExplanation = useCallback(
    async (preset: string, em: number, mh: number) => {
      setExplainLoading(true);
      setExplainError(null);
      try {
        const response = await storyAPI.explainInversionChamber({
          preset,
          emissions: em,
          mixing_height: mh,
        });
        if (response.data?.success) {
          setHowToUse(response.data.data.how_to_use);
          setDescription(response.data.data.description);
        } else {
          setExplainError(response.data?.error || 'Could not generate an explanation.');
        }
      } catch (err) {
        setExplainError('Could not reach the AI service for an explanation.');
      } finally {
        setExplainLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchExplanation('default', emissions, mixingHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const emissionsRef = useRef(emissions);
  const mixingHeightRef = useRef(mixingHeight);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    emissionsRef.current = emissions;
  }, [emissions]);

  useEffect(() => {
    mixingHeightRef.current = mixingHeight;
  }, [mixingHeight]);

  useEffect(() => {
    if (mixingHeight < 400) setHasSeenLowLid(true);
  }, [mixingHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const groundY = CANVAS_H - GROUND_MARGIN;

    const step = () => {
      const em = emissionsRef.current;
      const mh = mixingHeightRef.current;
      const lidY = heightToY(mh);
      const raw = (em / mh) * 1000;
      const targetCount = Math.min(650, Math.max(4, Math.round(raw * 1.3)));

      const particles = particlesRef.current;

      let alive = particles.filter((p) => !p.dying || p.alpha > 0.02);
      const aliveCount = alive.filter((p) => !p.dying).length;

      if (aliveCount < targetCount) {
        const toSpawn = Math.min(3, targetCount - aliveCount);
        for (let i = 0; i < toSpawn; i += 1) {
          alive.push({
            x: Math.random() * CANVAS_W,
            y: groundY,
            targetY: lidY + Math.random() * (groundY - lidY),
            vy: -(1.6 + Math.random() * 1.8),
            alpha: 0.16 + Math.random() * 0.18,
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

      const currentLidY = heightToY(mh);
      alive = alive.map((p) => {
        let { x, y, vy, alpha } = p;
        if (y > p.targetY) {
          y += vy;
          if (y < p.targetY) y = p.targetY;
        } else {
          x += (Math.random() - 0.5) * 0.5;
          y += (Math.random() - 0.5) * 0.5;
        }
        if (y < currentLidY) y = currentLidY;
        if (y > groundY) y = groundY;
        if (p.dying) alpha -= 0.03;
        return { ...p, x, y, alpha };
      });

      particlesRef.current = alive.filter((p) => p.alpha > 0.01);

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      particlesRef.current.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${p.alpha})`;
        ctx.fill();
      });

      const lidGradient = ctx.createLinearGradient(0, currentLidY - 22, 0, currentLidY + 22);
      lidGradient.addColorStop(0, 'rgba(0,0,0,0)');
      lidGradient.addColorStop(0.5, 'rgba(0,0,0,0.28)');
      lidGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lidGradient;
      ctx.fillRect(0, currentLidY - 22, CANVAS_W, 44);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, groundY, CANVAS_W, CANVAS_H - groundY);

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const rawConcentration = (emissions / mixingHeight) * 1000;
  const displayValue = Math.min(500, Math.round(rawConcentration));
  const overflow = rawConcentration > 500;
  const band = getBand(displayValue);
  const lidYpx = heightToY(mixingHeight);

  return (
    <section className="ic-root bg-white px-6 py-16 md:px-12">
      <style>{`
        .ic-root input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 1px;
          background: rgba(0,0,0,0.35);
        }
        .ic-root input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #000000;
          cursor: pointer;
          margin-top: -6.5px;
        }
        .ic-root input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: none;
          background: #000000;
          cursor: pointer;
        }
        .ic-root input[type="range"]::-moz-range-track {
          height: 1px;
          background: rgba(0,0,0,0.35);
        }
      `}</style>

      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-black">
          The Inversion Chamber
        </p>

        <div className="mt-8 flex flex-col gap-10 md:flex-row md:items-start">
          <div className="relative shrink-0 self-center border border-black md:self-start">
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />
            <div
              className="pointer-events-none absolute left-2 right-2 font-mono text-sm font-semibold leading-snug text-black transition-opacity duration-[1400ms]"
              style={{
                top: Math.max(6, lidYpx - 34),
                opacity: hasSeenLowLid ? 1 : 0,
              }}
            >
              Same emissions. Less air to hold them.
            </div>
          </div>

          <div className="flex w-full flex-col gap-8">
            <div>
              <div className="font-mono text-6xl font-bold leading-none" style={{ color: band.color }}>
                {displayValue}
                {overflow ? '+' : ''}
              </div>
              <div className="mt-2 font-mono text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: band.color }}>
                {band.label}
              </div>
            </div>

            <div className="border-t border-black" />

            <div>
              <div className="flex items-baseline justify-between font-mono text-sm uppercase tracking-[0.2em] text-black">
                <span>Emissions</span>
                <span className="text-lg font-bold text-black">{emissions}</span>
              </div>
              <input
                className="mt-4"
                type="range"
                min={0}
                max={100}
                value={emissions}
                onChange={(e) => setEmissions(Number(e.target.value))}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between font-mono text-sm uppercase tracking-[0.2em] text-black">
                <span>Mixing height</span>
                <span className="text-lg font-bold text-black">{mixingHeight}m</span>
              </div>
              <input
                className="mt-4"
                type="range"
                min={150}
                max={2000}
                value={mixingHeight}
                onChange={(e) => setMixingHeight(Number(e.target.value))}
              />
            </div>

            <div className="border-t border-black" />

            <div className="flex flex-wrap gap-3">
              {PRESETS.map((preset) => {
                const presetConcentration = Math.min(500, Math.round((preset.emissions / preset.height) * 1000));
                const presetBand = getBand(presetConcentration);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setEmissions(preset.emissions);
                      setMixingHeight(preset.height);
                      fetchExplanation(preset.key, preset.emissions, preset.height);
                    }}
                    style={{ borderColor: presetBand.color, color: presetBand.color }}
                    className="border-2 bg-white px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-colors hover:text-white"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = presetBand.color;
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.color = presetBand.color;
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="border-2 border-l-[6px] border-black bg-white p-4" style={{ borderLeftColor: band.color }}>
              {explainLoading && (
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-black">
                  Generating…
                </p>
              )}
              {!explainLoading && explainError && (
                <p className="font-mono text-xs text-black">{explainError}</p>
              )}
              {!explainLoading && !explainError && howToUse && (
                <>
                  <p className="font-mono text-sm font-bold" style={{ color: band.color }}>{howToUse}</p>
                  <p className="mt-2 font-mono text-sm leading-relaxed text-slate-800">
                    {description}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
