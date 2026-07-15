import React, { useEffect, useRef } from 'react';
import { MotionValue } from 'framer-motion';

// Scroll-reactive "settling smog" particle field - the point of this one is that it behaves
// differently depending on how you scroll, not just a fixed loop: scroll down and the field
// sinks and thickens (pollution settling under an inversion), scroll up and it visibly rises
// and thins (air clearing). At rest it still drifts gently, direction set by `severity` (down
// and murkier for a bad-AQI beat, up and clearer for a good one). `severity` accepts either a
// framer-motion MotionValue (read via .get() inside the animation loop, no React re-renders) or
// a plain number, so a section with no per-beat severity data can just pass a fixed baseline.
type Props = {
  severity?: MotionValue<number> | number;
  className?: string;
};

type FieldParticle = {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  wobbleSeed: number;
};

const PARTICLE_COUNT = 24;

function makeParticles(): FieldParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 3 + Math.random() * 6,
    baseAlpha: 0.28 + Math.random() * 0.32,
    wobbleSeed: Math.random() * Math.PI * 2,
  }));
}

function readSeverity(severity: MotionValue<number> | number): number {
  return typeof severity === 'number' ? severity : severity.get();
}

// Muted, low-contrast tones - soft blue-white when clearing, soft amber-grey when settling.
function colorForSeverity(sev: number, alpha: number): string {
  const clean = { r: 219, g: 234, b: 254 };
  const murky = { r: 196, g: 168, b: 130 };
  const t = Math.max(0, Math.min(1, sev));
  const r = Math.round(clean.r + (murky.r - clean.r) * t);
  const g = Math.round(clean.g + (murky.g - clean.g) * t);
  const b = Math.round(clean.b + (murky.b - clean.b) * t);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const PollutionScrollField: React.FC<Props> = ({ severity = 0.35, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const particlesRef = useRef<FieldParticle[]>(makeParticles());
  const velocityRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const tRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollYRef.current;
      lastScrollYRef.current = y;
      const clamped = Math.max(-30, Math.min(30, delta));
      velocityRef.current = velocityRef.current * 0.7 + clamped * 0.3;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const step = () => {
      tRef.current += 1;
      velocityRef.current *= 0.94;
      const v = velocityRef.current;
      const sev = readSeverity(severity);

      // Idle baseline: sinks a touch for a severe beat, rises a touch for a clean one. Active
      // scrolling adds on top of that - scrolling down pushes particles down harder, scrolling
      // up lifts them, so the field visibly answers which way you just scrolled.
      const baselineDrift = (sev - 0.35) * 0.045;
      const scrollDrift = v * 0.045;
      const dy = baselineDrift + scrollDrift;
      const scrollKick = Math.min(1, Math.abs(v) / 18);

      particlesRef.current.forEach((p, i) => {
        p.y += dy;
        p.wobbleSeed += 0.01;
        if (p.y > 106) {
          p.y = -6;
          p.x = Math.random() * 100;
        } else if (p.y < -6) {
          p.y = 106;
          p.x = Math.random() * 100;
        }

        const el = dotRefs.current[i];
        if (!el) return;
        const wobbleX = Math.sin(p.wobbleSeed + i) * 1.4;
        const alpha = Math.min(1, p.baseAlpha * (0.5 + sev * 0.7) * (1 + scrollKick * 0.6));
        el.style.transform = `translate3d(${wobbleX}px, 0, 0)`;
        el.style.top = `${p.y}%`;
        el.style.left = `${p.x}%`;
        el.style.width = `${p.size}px`;
        el.style.height = `${p.size}px`;
        el.style.background = colorForSeverity(sev, alpha);
      });

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={className}
      style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {particlesRef.current.map((p, i) => (
        <div
          key={i}
          ref={(el) => {
            dotRefs.current[i] = el;
          }}
          className="psf-dot"
          style={{ position: 'absolute', top: `${p.y}%`, left: `${p.x}%`, width: p.size, height: p.size }}
        />
      ))}
      <style>{`
        .psf-dot {
          border-radius: 9999px;
          filter: blur(4px);
          will-change: transform, top;
        }
        @media (prefers-reduced-motion: reduce) {
          .psf-dot { display: none; }
        }
      `}</style>
    </div>
  );
};
