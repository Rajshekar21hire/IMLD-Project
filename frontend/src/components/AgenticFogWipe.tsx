import React, { useEffect, useRef, useState } from 'react';

type Props = {
  // Bump this (e.g. an incrementing counter) each time a new slide becomes active to replay the
  // wipe. `null`/unchanged means "don't animate."
  triggerKey: number | null;
};

type Depth = 'far' | 'mid' | 'near';

type Puff = {
  top: string;
  size: number;
  blur: number;
  delay: number;
  duration: number;
  opacity: number;
  depth: Depth;
};

// Three depth layers give the fog bank a rough sense of 3D: distant puffs are smaller, softer,
// dimmer and slower; near puffs are bigger, heavier-blurred, brighter and faster - the classic
// parallax depth cue (near things move faster and loom larger) - rather than one flat plane of
// identical shapes. Each puff also gets an off-centre highlight (radial gradient, not a flat
// circle) so it reads as a lit, puffy volume instead of a blurred disc.
const PUFFS: Puff[] = [
  // far
  { top: '14%', size: 170, blur: 20, delay: 40, duration: 1900, opacity: 0.32, depth: 'far' },
  { top: '48%', size: 190, blur: 22, delay: 160, duration: 2000, opacity: 0.3, depth: 'far' },
  { top: '80%', size: 160, blur: 18, delay: 90, duration: 1850, opacity: 0.3, depth: 'far' },
  // mid
  { top: '26%', size: 260, blur: 30, delay: 20, duration: 1500, opacity: 0.5, depth: 'mid' },
  { top: '58%', size: 280, blur: 32, delay: 130, duration: 1550, opacity: 0.48, depth: 'mid' },
  { top: '88%', size: 230, blur: 28, delay: 70, duration: 1450, opacity: 0.46, depth: 'mid' },
  // near
  { top: '8%', size: 360, blur: 46, delay: 0, duration: 1150, opacity: 0.68, depth: 'near' },
  { top: '40%', size: 420, blur: 52, delay: 60, duration: 1200, opacity: 0.72, depth: 'near' },
  { top: '68%', size: 340, blur: 44, delay: 30, duration: 1100, opacity: 0.66, depth: 'near' },
];

// Fast, thin gusts that streak across ahead of/through the fog bank to sell "strong wind," much
// quicker than the clouds themselves.
const STREAKS = [
  { top: '20%', delay: 0, duration: 650, opacity: 0.5 },
  { top: '45%', delay: 90, duration: 600, opacity: 0.45 },
  { top: '70%', delay: 50, duration: 700, opacity: 0.4 },
];

const HIDE_DELAY_MS = 2200;

export const AgenticFogWipe: React.FC<Props> = ({ triggerKey }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (triggerKey === null) return;
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [triggerKey]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="agentic-fog-wipe-root"
      style={{ position: 'fixed', inset: 0, zIndex: 45, overflow: 'hidden', pointerEvents: 'none', perspective: 600 }}
    >
      <div className="agentic-fog-wash" />

      {PUFFS.map((p, i) => (
        <div
          key={`${triggerKey}-puff-${i}`}
          className={`agentic-fog-puff agentic-fog-puff--${p.depth}`}
          style={
            {
              top: p.top,
              width: p.size,
              height: p.size,
              filter: `blur(${p.blur}px)`,
              animationDuration: `${p.duration}ms`,
              animationDelay: `${p.delay}ms`,
              '--puff-opacity': p.opacity,
            } as React.CSSProperties
          }
        />
      ))}

      {STREAKS.map((s, i) => (
        <div
          key={`${triggerKey}-streak-${i}`}
          className="agentic-wind-streak"
          style={
            {
              top: s.top,
              animationDuration: `${s.duration}ms`,
              animationDelay: `${s.delay}ms`,
              '--streak-opacity': s.opacity,
            } as React.CSSProperties
          }
        />
      ))}

      <style>{`
        .agentic-fog-wash {
          position: absolute;
          inset: -5%;
          background: linear-gradient(100deg,
            rgba(255,255,255,0) 0%,
            rgba(226,240,255,0.55) 30%,
            rgba(255,255,255,0.7) 50%,
            rgba(203,228,255,0.5) 70%,
            rgba(255,255,255,0) 100%);
          filter: blur(18px);
          animation: agentic-fog-wash-pulse 1400ms ease-in-out forwards;
        }
        @keyframes agentic-fog-wash-pulse {
          0% { opacity: 0; transform: translate3d(-8%, 0, 0); }
          30% { opacity: 1; }
          65% { opacity: 0.9; }
          100% { opacity: 0; transform: translate3d(8%, 0, 0); }
        }

        .agentic-fog-puff {
          position: absolute;
          left: -24%;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 30%,
            rgba(255,255,255,0.98) 0%,
            rgba(226,240,255,0.7) 42%,
            rgba(203,222,240,0.28) 68%,
            rgba(255,255,255,0) 78%);
          animation-name: agentic-fog-puff-drift;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
          transform-style: preserve-3d;
        }
        .agentic-fog-puff--far { opacity: 0; }
        .agentic-fog-puff--mid { opacity: 0; }
        .agentic-fog-puff--near { opacity: 0; box-shadow: 0 18px 40px rgba(15,36,55,0.06); }

        @keyframes agentic-fog-puff-drift {
          0% { transform: translate3d(0, 0, 0) scale(0.72); opacity: 0; }
          16% { opacity: var(--puff-opacity, 0.45); }
          48% { transform: translate3d(56vw, -1.5%, 0) scale(1.18); }
          82% { opacity: var(--puff-opacity, 0.45); }
          100% { transform: translate3d(126vw, 1.5%, 0) scale(0.9); opacity: 0; }
        }

        .agentic-wind-streak {
          position: absolute;
          left: -30%;
          width: 55%;
          height: 5px;
          border-radius: 9999px;
          filter: blur(5px);
          background: linear-gradient(90deg,
            rgba(255,255,255,0) 0%,
            rgba(240,249,255,0.9) 45%,
            rgba(255,255,255,0) 100%);
          animation-name: agentic-wind-streak-move;
          animation-timing-function: cubic-bezier(0.3, 0.6, 0.2, 1);
          animation-fill-mode: forwards;
        }
        @keyframes agentic-wind-streak-move {
          0% { transform: translate3d(0, 0, 0) scaleX(0.6); opacity: 0; }
          18% { opacity: var(--streak-opacity, 0.5); }
          100% { transform: translate3d(150vw, 0, 0) scaleX(1.5); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .agentic-fog-wipe-root { display: none; }
        }
      `}</style>
    </div>
  );
};
