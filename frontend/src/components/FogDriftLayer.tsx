import React, { useEffect, useRef, useState } from 'react';

// Shared ambient fog motif for the Agentic AI and Ollama deep-dive sections: a slow ambient
// drift (streaks/particles/orbs) plus a swift, scroll-triggered fog sweep - each scroll tick
// sends one soft blurred band swiftly left to right across whatever's currently in view. Low
// opacity and pointer-events: none throughout, so nothing here ever blocks or competes with the
// content in front of it. Respects prefers-reduced-motion by disabling all motion entirely.
type Props = {
  opacity?: number;
  className?: string;
};

const PARTICLES = [
  { top: '9%', size: 10, duration: '22s', delay: '-2s', blur: 3, alpha: 0.5 },
  { top: '17%', size: 6, duration: '28s', delay: '-14s', blur: 2, alpha: 0.4 },
  { top: '26%', size: 14, duration: '34s', delay: '-6s', blur: 4, alpha: 0.45 },
  { top: '34%', size: 8, duration: '19s', delay: '-9s', blur: 3, alpha: 0.5 },
  { top: '43%', size: 12, duration: '30s', delay: '-20s', blur: 4, alpha: 0.4 },
  { top: '52%', size: 7, duration: '24s', delay: '-4s', blur: 2, alpha: 0.5 },
  { top: '61%', size: 11, duration: '33s', delay: '-17s', blur: 4, alpha: 0.42 },
  { top: '69%', size: 9, duration: '21s', delay: '-11s', blur: 3, alpha: 0.48 },
  { top: '78%', size: 13, duration: '29s', delay: '-24s', blur: 4, alpha: 0.4 },
  { top: '87%', size: 8, duration: '26s', delay: '-8s', blur: 3, alpha: 0.46 },
];

// Larger, colourful glowing orbs that drift slowly top-to-bottom (with a gentle side-to-side
// sway) - a second layer of ambient motion on top of the fine horizontal particles, still
// soft/blurred/low-opacity so it never competes with foreground content.
const ORBS = [
  { left: '8%', size: 70, duration: '48s', delay: '-6s', color: 'rgba(125,211,252,0.55)' },
  { left: '78%', size: 90, duration: '58s', delay: '-30s', color: 'rgba(196,181,253,0.5)' },
  { left: '32%', size: 60, duration: '42s', delay: '-18s', color: 'rgba(253,224,71,0.45)' },
  { left: '58%', size: 56, duration: '52s', delay: '-40s', color: 'rgba(134,239,172,0.45)' },
  { left: '18%', size: 46, duration: '38s', delay: '-24s', color: 'rgba(251,146,60,0.4)' },
];

export const FogDriftLayer: React.FC<Props> = ({ opacity = 1, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sweeps, setSweeps] = useState<number[]>([]);
  const nextIdRef = useRef(0);
  const isVisibleRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      isVisibleRef.current = true;
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    lastScrollYRef.current = window.scrollY;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        const delta = Math.abs(y - lastScrollYRef.current);
        lastScrollYRef.current = y;
        const now = performance.now();
        if (isVisibleRef.current && delta > 30 && now - lastTriggerRef.current > 450) {
          lastTriggerRef.current = now;
          const id = nextIdRef.current++;
          setSweeps((current) => [...current, id]);
          window.setTimeout(() => {
            setSweeps((current) => current.filter((s) => s !== id));
          }, 1300);
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={className}
      style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', opacity }}
    >
      <div className="fog-drift-streak fog-drift-streak-1" />
      <div className="fog-drift-streak fog-drift-streak-2" />

      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="fog-drift-particle"
          style={{
            top: p.top,
            width: p.size,
            height: p.size,
            filter: `blur(${p.blur}px)`,
            background: `rgba(255,255,255,${p.alpha})`,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}

      {ORBS.map((o, i) => (
        <div
          key={i}
          className="fog-drift-orb"
          style={{
            left: o.left,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle, ${o.color} 0%, rgba(255,255,255,0) 72%)`,
            animationDuration: o.duration,
            animationDelay: o.delay,
          }}
        />
      ))}

      {sweeps.map((id) => (
        <div key={id} className="fog-scroll-sweep" />
      ))}

      <style>{`
        .fog-drift-streak {
          position: absolute;
          left: -20%;
          width: 140%;
          border-radius: 9999px;
          filter: blur(28px);
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .fog-drift-streak-1 {
          top: 12%;
          height: 220px;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(214,236,255,0.4) 45%, rgba(255,255,255,0) 100%);
          animation-name: fog-drift-left-right;
          animation-duration: 36s;
        }
        .fog-drift-streak-2 {
          top: 55%;
          height: 240px;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(193,225,255,0.35) 45%, rgba(255,255,255,0) 100%);
          animation-name: fog-drift-left-right;
          animation-duration: 44s;
          animation-delay: -20s;
        }
        .fog-drift-particle {
          position: absolute;
          left: -4%;
          border-radius: 9999px;
          animation-name: fog-drift-particle-left-right;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes fog-drift-left-right {
          0% { transform: translate3d(-15%, 0, 0); }
          100% { transform: translate3d(15%, 0, 0); }
        }
        @keyframes fog-drift-particle-left-right {
          0% { left: -4%; }
          100% { left: 104%; }
        }
        .fog-drift-orb {
          position: absolute;
          top: -12%;
          border-radius: 9999px;
          filter: blur(6px);
          animation-name: fog-drift-orb-down;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes fog-drift-orb-down {
          0% { top: -12%; transform: translateX(0); }
          25% { transform: translateX(18px); }
          50% { transform: translateX(-12px); }
          75% { transform: translateX(14px); }
          100% { top: 108%; transform: translateX(0); }
        }
        .fog-scroll-sweep {
          position: absolute;
          top: 0;
          left: -45%;
          width: 45%;
          height: 100%;
          filter: blur(22px);
          background: linear-gradient(90deg,
            rgba(255,255,255,0) 0%,
            rgba(224,242,255,0.65) 40%,
            rgba(186,230,253,0.55) 60%,
            rgba(255,255,255,0) 100%);
          animation: fog-scroll-sweep-move 1100ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
        }
        @keyframes fog-scroll-sweep-move {
          0% { transform: translate3d(0, 0, 0); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translate3d(320%, 0, 0); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fog-drift-streak,
          .fog-drift-particle,
          .fog-drift-orb,
          .fog-scroll-sweep {
            animation: none !important;
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
