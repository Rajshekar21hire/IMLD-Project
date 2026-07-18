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

// Softer, lower-contrast pastel tones - same AQI ordering as everywhere else on the page, just
// muted a step further so the readout sits quietly on a light background instead of shouting.
const getBand = (value: number) => {
  if (value <= 50) return { label: 'Good', color: '#7bc9b8' };
  if (value <= 100) return { label: 'Moderate', color: '#e0be6b' };
  if (value <= 150) return { label: 'Unhealthy for sensitive groups', color: '#e3a374' };
  if (value <= 200) return { label: 'Unhealthy', color: '#dd8f8f' };
  if (value <= 300) return { label: 'Very unhealthy', color: '#c99bd6' };
  return { label: 'Hazardous', color: '#d992a3' };
};

const PRESETS = [
  { key: 'monsoon', label: 'Monsoon afternoon', emissions: 55, height: 1800 },
  { key: 'october', label: 'October evening', emissions: 62, height: 700 },
  { key: 'january', label: 'January morning', emissions: 78, height: 160 },
] as const;

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export const InversionChamber: React.FC = () => {
  const [emissions, setEmissions] = useState(50);
  const [mixingHeight, setMixingHeight] = useState(900);
  const [hasSeenLowLid, setHasSeenLowLid] = useState(false);
  const [playingPresets, setPlayingPresets] = useState(false);

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

  // Auto-cycle through the three presets so there's a hands-off way to see the whole range,
  // not just a manual one - stops as soon as the visitor touches a slider or preset themselves.
  useEffect(() => {
    if (!playingPresets) return;
    let i = PRESETS.findIndex((p) => p.emissions === emissionsRef.current && p.height === mixingHeightRef.current);
    const interval = setInterval(() => {
      i = (i + 1) % PRESETS.length;
      const preset = PRESETS[i];
      setEmissions(preset.emissions);
      setMixingHeight(preset.height);
      fetchExplanation(preset.key, preset.emissions, preset.height);
    }, 3200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingPresets]);

  const yToHeight = (y: number) => {
    const usable = CANVAS_H - GROUND_MARGIN - SKY_MARGIN;
    const t = Math.min(1, Math.max(0, (CANVAS_H - GROUND_MARGIN - y) / usable));
    return Math.round(t * MAX_HEIGHT_M);
  };

  const draggingRef = useRef(false);
  const handleCanvasPointer = (clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = ((clientY - rect.top) / rect.height) * CANVAS_H;
    setPlayingPresets(false);
    setMixingHeight(Math.min(2000, Math.max(150, yToHeight(y))));
  };

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
            alpha: 0.35 + Math.random() * 0.35,
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

      const concentration = Math.min(500, Math.round((em / mh) * 1000));
      const bandColor = getBand(concentration).color;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGradient.addColorStop(0, '#f8fafc');
      skyGradient.addColorStop(0.6, hexToRgba(bandColor, 0.08));
      skyGradient.addColorStop(1, hexToRgba(bandColor, 0.14));
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      const vignette = ctx.createRadialGradient(CANVAS_W / 2, groundY * 0.5, 20, CANVAS_W / 2, groundY * 0.5, CANVAS_W * 0.9);
      vignette.addColorStop(0, hexToRgba(bandColor, 0.08));
      vignette.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, CANVAS_W, groundY);

      particlesRef.current.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.9, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(bandColor, p.alpha * 0.8);
        ctx.fill();
      });

      ctx.save();
      ctx.shadowColor = hexToRgba(bandColor, 0.6);
      ctx.shadowBlur = 10;
      const lidGradient = ctx.createLinearGradient(0, currentLidY - 3, 0, currentLidY + 3);
      lidGradient.addColorStop(0, hexToRgba(bandColor, 0));
      lidGradient.addColorStop(0.5, hexToRgba(bandColor, 0.75));
      lidGradient.addColorStop(1, hexToRgba(bandColor, 0));
      ctx.fillStyle = lidGradient;
      ctx.fillRect(0, currentLidY - 3, CANVAS_W, 6);
      ctx.restore();

      const groundGradient = ctx.createLinearGradient(0, groundY, 0, CANVAS_H);
      groundGradient.addColorStop(0, hexToRgba(bandColor, 0.35));
      groundGradient.addColorStop(1, hexToRgba(bandColor, 0.55));
      ctx.fillStyle = groundGradient;
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
    <section className="ic-root bg-transparent px-6 py-10 md:px-12">
      <style>{`
        .ic-root input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 9999px;
        }
        .ic-root input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${band.color};
          box-shadow: 0 2px 8px rgba(15,36,55,0.25);
          cursor: pointer;
        }
        .ic-root input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: none;
          background: ${band.color};
          box-shadow: 0 2px 8px rgba(15,36,55,0.25);
          cursor: pointer;
        }
      `}</style>

      <div className="s4h-root mx-auto max-w-[170rem]">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0C447C]">Inversion chamber</p>
          <h2 className="mt-3 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">
            See <span style={{ color: '#d17117' }}>Pollution</span> in Motion
          </h2>
          <p className="mx-auto mt-2 max-w-4xl text-base leading-relaxed text-slate-600">
            Adjust emissions and mixing height to see how a lower atmospheric lid traps pollution and spikes concentration.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-center">
          <div
            className="relative shrink-0 self-center overflow-hidden rounded-2xl border md:self-start"
            style={{ borderColor: 'var(--ss-border)', boxShadow: '0 8px 24px rgba(15,36,55,0.1)' }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{ cursor: 'ns-resize', touchAction: 'none', display: 'block' }}
              onPointerDown={(e) => {
                draggingRef.current = true;
                (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                handleCanvasPointer(e.clientY);
              }}
              onPointerMove={(e) => {
                if (draggingRef.current) handleCanvasPointer(e.clientY);
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
              onPointerLeave={() => {
                draggingRef.current = false;
              }}
            />
            <div
              className="pointer-events-none absolute left-2 right-2 text-sm font-semibold leading-snug"
              style={{
                top: Math.max(6, lidYpx - 34),
                opacity: hasSeenLowLid ? 1 : 0,
                color: 'var(--ss-text)',
                transition: 'opacity 1400ms',
                textShadow: '0 1px 4px rgba(255,255,255,0.8)',
              }}
            >
              Same emissions. Less air to hold them.
            </div>
            <div className="pointer-events-none absolute bottom-2 left-2 right-2 text-center text-[10px] uppercase tracking-[0.15em]" style={{ color: 'var(--ss-muted)' }}>
              Drag inside the chamber to move the ceiling
            </div>
          </div>

          <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
            <div>
              <div className="text-6xl font-black leading-none" style={{ color: band.color }}>
                {displayValue}
                {overflow ? '+' : ''}
              </div>
              <div className="mt-2 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: band.color }}>
                {band.label}
              </div>
            </div>

            <div className="w-full border-t" style={{ borderColor: 'var(--ss-border)' }} />

            <div className="w-full">
              <div className="flex items-baseline justify-center gap-4 text-sm uppercase tracking-[0.2em]" style={{ color: 'var(--ss-muted)' }}>
                <span>Emissions</span>
                <span className="text-lg font-bold" style={{ color: band.color }}>{emissions}</span>
              </div>
              <input
                className="mt-4"
                type="range"
                min={0}
                max={100}
                value={emissions}
                onChange={(e) => {
                  setPlayingPresets(false);
                  setEmissions(Number(e.target.value));
                }}
                style={{ background: `linear-gradient(90deg, ${band.color} 0%, ${band.color} ${emissions}%, rgba(148,163,184,0.28) ${emissions}%, rgba(148,163,184,0.28) 100%)` }}
              />
            </div>

            <div className="w-full">
              <div className="flex items-baseline justify-center gap-4 text-sm uppercase tracking-[0.2em]" style={{ color: 'var(--ss-muted)' }}>
                <span>Mixing height</span>
                <span className="text-lg font-bold" style={{ color: band.color }}>{mixingHeight}m</span>
              </div>
              <input
                className="mt-4"
                type="range"
                min={150}
                max={2000}
                value={mixingHeight}
                onChange={(e) => {
                  setPlayingPresets(false);
                  setMixingHeight(Number(e.target.value));
                }}
                style={{
                  background: `linear-gradient(90deg, ${band.color} 0%, ${band.color} ${((mixingHeight - 150) / (2000 - 150)) * 100}%, rgba(148,163,184,0.28) ${((mixingHeight - 150) / (2000 - 150)) * 100}%, rgba(148,163,184,0.28) 100%)`,
                }}
              />
            </div>

            <div className="w-full border-t" style={{ borderColor: 'var(--ss-border)' }} />

            <div className="flex flex-wrap items-center justify-center gap-3">
              {PRESETS.map((preset) => {
                const presetConcentration = Math.min(500, Math.round((preset.emissions / preset.height) * 1000));
                const presetBand = getBand(presetConcentration);
                const isActive = !playingPresets && emissions === preset.emissions && mixingHeight === preset.height;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setPlayingPresets(false);
                      setEmissions(preset.emissions);
                      setMixingHeight(preset.height);
                      fetchExplanation(preset.key, preset.emissions, preset.height);
                    }}
                    style={{
                      color: isActive ? '#ffffff' : presetBand.color,
                      backgroundColor: isActive ? presetBand.color : hexToRgba(presetBand.color, 0.12),
                      border: `1.5px solid ${isActive ? presetBand.color : hexToRgba(presetBand.color, 0.3)}`,
                    }}
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all"
                  >
                    {preset.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPlayingPresets((p) => !p)}
                className="rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition-all"
                style={{
                  backgroundColor: playingPresets ? 'rgba(255,255,255,0.7)' : band.color,
                  color: playingPresets ? band.color : '#ffffff',
                  border: `1.5px solid ${band.color}`,
                }}
                aria-pressed={playingPresets}
              >
                {playingPresets ? '❚❚ Stop' : '▶ Cycle presets'}
              </button>
            </div>

            <div
              className="w-full rounded-2xl border-l-[6px] bg-white/70 p-4 text-center"
              style={{ borderColor: 'var(--ss-border)', borderLeftColor: band.color }}
            >
              {explainLoading && (
                <p className="text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--ss-muted)' }}>
                  Generating…
                </p>
              )}
              {!explainLoading && explainError && (
                <p className="text-xs" style={{ color: 'var(--ss-muted)' }}>{explainError}</p>
              )}
              {!explainLoading && !explainError && howToUse && (
                <>
                  <p className="text-sm font-bold" style={{ color: band.color }}>{howToUse}</p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ss-text)' }}>
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
