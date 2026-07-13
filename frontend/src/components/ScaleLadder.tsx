import React, { useEffect, useMemo, useRef, useState } from 'react';
import { storyAPI } from '../services/api';

type Rung = {
  id: string;
  name: string;
  population: number;
  visibleTarget: number;
  generalRadiusTarget: number;
  markerRadiusTarget: number;
  markerAmber: boolean;
  markerRing: boolean;
  markerFindable: boolean;
};

const RUNGS: Rung[] = [
  { id: 'person', name: 'One person', population: 1, visibleTarget: 1, generalRadiusTarget: 40, markerRadiusTarget: 40, markerAmber: true, markerRing: true, markerFindable: true },
  { id: 'household', name: 'One household', population: 5, visibleTarget: 5, generalRadiusTarget: 13, markerRadiusTarget: 16, markerAmber: true, markerRing: true, markerFindable: true },
  { id: 'street', name: 'One street', population: 400, visibleTarget: 400, generalRadiusTarget: 5, markerRadiusTarget: 6.5, markerAmber: true, markerRing: true, markerFindable: true },
  { id: 'city', name: 'One city', population: 20_000_000, visibleTarget: 1200, generalRadiusTarget: 2.4, markerRadiusTarget: 3, markerAmber: true, markerRing: true, markerFindable: true },
  { id: 'airshed', name: 'One airshed', population: 400_000_000, visibleTarget: 2000, generalRadiusTarget: 1.4, markerRadiusTarget: 1.1, markerAmber: true, markerRing: false, markerFindable: false },
  { id: 'subcontinent', name: 'Subcontinent and beyond', population: 2_000_000_000, visibleTarget: 2500, generalRadiusTarget: 1, markerRadiusTarget: 1, markerAmber: false, markerRing: false, markerFindable: false },
];

const FILLER_NAMES = ['Priya', 'Rahim', 'Meera', 'Zafar'];

const FALLBACK_IDENTITY = { name: 'Asha', age: 34, detail: 'who waters the tulsi plant on her balcony each morning' };

const FALLBACK_RUNGS: Record<string, { orientation: string; rung: string }> = {
  person: { orientation: 'One dot, one person, easy to see.', rung: 'Asha waters her tulsi plant every morning.' },
  household: { orientation: 'Four more dots have joined her. She is still the clearest one on screen.', rung: 'Asha is one of five in her home.' },
  street: { orientation: 'Hundreds of dots now fill the frame. A ring still marks her position.', rung: 'Asha is one of four hundred on her street.' },
  city: { orientation: 'The dots form a dense field. Only the marker finds her now.', rung: 'Asha is one of twenty million.' },
  airshed: { orientation: 'The marker has shrunk below the size of the surrounding dots.', rung: 'Asha is one of four hundred million.' },
  subcontinent: { orientation: 'The field is solid. No marker remains.', rung: '' },
};

const DOT_COUNT = 2500;
const CANVAS_W = 720;
const CANVAS_H = 480;

const PANEL_BG = '#08090b';
const PANEL_TEXT = '#e8e4dd';
const PANEL_BORDER = 'rgba(255,255,255,0.08)';
const LABEL_COLOR = '#6b7280';
const RUNG_LABEL = '#f2efe9';
const FIGURE_TEXT = '#c9c5be';
const GEN_TEXT = '#b8b3aa';
const NAV_TEXT = '#c9c5be';
const NAV_BORDER = 'rgba(242,239,233,0.3)';
const BONE = 'rgba(239,233,223,0.8)';
const AMBER = '#e8b563';
const NAME_DIM = 'rgba(242,239,233,0.35)';
const NAME_BRIGHT = '#f2efe9';

function formatPopulation(n: number) {
  return n.toLocaleString('en-US');
}

export const ScaleLadder: React.FC = () => {
  const [rungIndex, setRungIndex] = useState(0);
  const [identity, setIdentity] = useState<{ name: string; age: number; detail: string } | null>(null);
  const [rungTexts, setRungTexts] = useState<Record<string, { orientation: string; rung: string }>>({});
  const [loadingRung, setLoadingRung] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const currentVisibleRef = useRef(RUNGS[0].visibleTarget);
  const currentGeneralRadiusRef = useRef(RUNGS[0].generalRadiusTarget);
  const currentMarkerRadiusRef = useRef(RUNGS[0].markerRadiusTarget);
  const rungIndexRef = useRef(0);

  const dots = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed % 10000) / 10000;
    };
    for (let i = 0; i < DOT_COUNT; i += 1) {
      arr.push({ x: rand() * CANVAS_W, y: rand() * CANVAS_H });
    }
    return arr;
  }, []);

  useEffect(() => {
    rungIndexRef.current = rungIndex;
  }, [rungIndex]);

  const currentRung = RUNGS[rungIndex];
  const prevRung = rungIndex > 0 ? RUNGS[rungIndex - 1] : null;

  // Generate the one persistent identity, once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await storyAPI.scaleLadderIdentity({});
        if (!cancelled && res.data?.success) {
          setIdentity({ name: res.data.data.name, age: res.data.data.age, detail: res.data.data.detail });
        } else if (!cancelled) {
          setIdentity(FALLBACK_IDENTITY);
        }
      } catch {
        if (!cancelled) setIdentity(FALLBACK_IDENTITY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch this rung's orientation + rung text once identity is known.
  useEffect(() => {
    if (!identity) return;
    if (rungTexts[currentRung.id]) return;
    let cancelled = false;
    setLoadingRung(currentRung.id);

    (async () => {
      try {
        const res = await storyAPI.scaleLadderRung({
          name: identity.name,
          age: identity.age,
          detail: identity.detail,
          rung_name: currentRung.name,
          prev_rung_name: prevRung?.name || '',
          population: currentRung.population,
          visible_count: currentRung.visibleTarget,
          radius: currentRung.markerRadiusTarget,
          marker_findable: currentRung.markerFindable,
        });
        if (cancelled) return;
        if (res.data?.success) {
          const isLast = rungIndex === RUNGS.length - 1;
          setRungTexts((current) => ({
            ...current,
            [currentRung.id]: {
              orientation: res.data.data.orientation,
              rung: isLast ? `${identity.name} is one of 3.7 million.` : res.data.data.rung,
            },
          }));
        } else {
          const fallback = FALLBACK_RUNGS[currentRung.id];
          setRungTexts((current) => ({
            ...current,
            [currentRung.id]: {
              orientation: fallback.orientation,
              rung: rungIndex === RUNGS.length - 1 ? `${identity.name} is one of 3.7 million.` : fallback.rung,
            },
          }));
        }
      } catch {
        if (!cancelled) {
          const fallback = FALLBACK_RUNGS[currentRung.id];
          setRungTexts((current) => ({
            ...current,
            [currentRung.id]: {
              orientation: fallback.orientation,
              rung: rungIndex === RUNGS.length - 1 ? `${identity.name} is one of 3.7 million.` : fallback.rung,
            },
          }));
        }
      } finally {
        if (!cancelled) setLoadingRung(null);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, currentRung.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const step = (timestamp: number) => {
      const rung = RUNGS[rungIndexRef.current];

      currentVisibleRef.current += (rung.visibleTarget - currentVisibleRef.current) * 0.08;
      currentGeneralRadiusRef.current += (rung.generalRadiusTarget - currentGeneralRadiusRef.current) * 0.08;
      currentMarkerRadiusRef.current += (rung.markerRadiusTarget - currentMarkerRadiusRef.current) * 0.08;

      const visibleCount = Math.round(currentVisibleRef.current);
      let generalRadius = currentGeneralRadiusRef.current;
      const markerRadius = currentMarkerRadiusRef.current;

      if (rungIndexRef.current === 0) {
        generalRadius += Math.sin(timestamp / 260) * 3;
      }

      // Clear to the panel's own background, never transparent.
      ctx.fillStyle = PANEL_BG;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      for (let i = 1; i < visibleCount && i < dots.length; i += 1) {
        const dot = dots[i];
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, Math.max(0.5, generalRadius), 0, Math.PI * 2);
        ctx.fillStyle = BONE;
        ctx.fill();
      }

      if (visibleCount >= 1) {
        const her = dots[0];
        ctx.beginPath();
        ctx.arc(her.x, her.y, Math.max(0.5, markerRadius), 0, Math.PI * 2);
        ctx.fillStyle = rung.markerAmber ? AMBER : BONE;
        ctx.fill();

        if (rung.markerRing) {
          ctx.beginPath();
          ctx.arc(her.x, her.y, markerRadius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = AMBER;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [dots]);

  const goPrev = () => setRungIndex((i) => Math.max(0, i - 1));
  const goNext = () => setRungIndex((i) => Math.min(RUNGS.length - 1, i + 1));

  const texts = rungTexts[currentRung.id];
  const isLoading = loadingRung === currentRung.id || !identity;
  const herPos = dots[0];

  return (
    <section
      className="sl-root w-full font-mono"
      style={{
        background: PANEL_BG,
        color: PANEL_TEXT,
        padding: '48px 32px',
      }}
    >
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase" style={{ letterSpacing: '0.3em', color: LABEL_COLOR, margin: 0 }}>
          Scale Ladder
        </p>
        <div style={{ borderBottom: `1px solid ${PANEL_BORDER}`, marginTop: '16px', marginBottom: '24px' }} />

        <div className="flex items-center gap-4 text-xs uppercase" style={{ letterSpacing: '0.15em' }}>
          <button
            type="button"
            onClick={goPrev}
            disabled={rungIndex === 0}
            style={{
              border: `1px solid ${NAV_BORDER}`,
              color: NAV_TEXT,
              opacity: rungIndex === 0 ? 0.2 : 1,
              cursor: rungIndex === 0 ? 'not-allowed' : 'pointer',
              background: 'transparent',
            }}
            className="px-3 py-1.5"
          >
            ← prev
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={rungIndex === RUNGS.length - 1}
            style={{
              border: `1px solid ${NAV_BORDER}`,
              color: NAV_TEXT,
              opacity: rungIndex === RUNGS.length - 1 ? 0.2 : 1,
              cursor: rungIndex === RUNGS.length - 1 ? 'not-allowed' : 'pointer',
              background: 'transparent',
            }}
            className="px-3 py-1.5"
          >
            next →
          </button>
          <span style={{ color: LABEL_COLOR }}>
            {rungIndex + 1} / {RUNGS.length}
          </span>
        </div>

        <div className="mt-6">
          <div className="text-xl font-bold leading-tight" style={{ color: RUNG_LABEL }}>{currentRung.name}</div>
          <div className="mt-1 text-sm" style={{ color: FIGURE_TEXT }}>{formatPopulation(currentRung.population)} people</div>
          <div
            className="mt-3 min-h-[1.5rem] max-w-2xl text-sm leading-relaxed transition-opacity duration-700"
            style={{ opacity: isLoading ? 0 : 1, color: GEN_TEXT }}
          >
            {texts?.orientation}
          </div>
        </div>

        <div className="relative mt-4">
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              maxWidth: CANVAS_W,
              height: '480px',
              display: 'block',
              border: `1px solid ${PANEL_BORDER}`,
              background: PANEL_BG,
            }}
          />

          {rungIndex === 0 && (
            <div
              className="pointer-events-none absolute text-sm"
              style={{
                left: `${((herPos.x + 48) / CANVAS_W) * 100}%`,
                top: `${(herPos.y / CANVAS_H) * 100}%`,
                color: NAME_BRIGHT,
                maxWidth: '220px',
              }}
            >
              <div className="font-bold">{identity?.name}{identity?.age ? `, ${identity.age}` : ''}</div>
              <div className="mt-1" style={{ color: FIGURE_TEXT }}>{identity?.detail}</div>
            </div>
          )}

          {rungIndex === 1 && identity && (
            <>
              <div
                className="pointer-events-none absolute text-sm font-bold"
                style={{
                  left: `${((herPos.x + 14) / CANVAS_W) * 100}%`,
                  top: `${(herPos.y - 10) / CANVAS_H * 100}%`,
                  color: NAME_BRIGHT,
                }}
              >
                {identity.name}
              </div>
              {FILLER_NAMES.map((name, idx) => {
                const d = dots[idx + 1];
                return (
                  <div
                    key={name}
                    className="pointer-events-none absolute text-xs"
                    style={{
                      left: `${((d.x + 10) / CANVAS_W) * 100}%`,
                      top: `${((d.y - 8) / CANVAS_H) * 100}%`,
                      color: NAME_DIM,
                    }}
                  >
                    {name}
                  </div>
                );
              })}
            </>
          )}

          {rungIndex === 2 && identity && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: `${((herPos.x + 8) / CANVAS_W) * 100}%`,
                top: `${((herPos.y - 6) / CANVAS_H) * 100}%`,
                color: NAME_DIM,
                fontSize: '7px',
              }}
            >
              {identity.name}
            </div>
          )}

          {rungIndex === RUNGS.length - 1 && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-lg font-bold"
              style={{ color: RUNG_LABEL }}
            >
              {identity ? `${identity.name} is one of 3.7 million.` : ''}
            </div>
          )}
        </div>

        <div
          className="mt-4 min-h-[1.5rem] max-w-2xl text-base leading-relaxed transition-opacity duration-700"
          style={{ opacity: isLoading ? 0 : 1, color: GEN_TEXT }}
        >
          {rungIndex === RUNGS.length - 1 ? '' : texts?.rung}
        </div>
      </div>
    </section>
  );
};
