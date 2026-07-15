import { RefObject } from 'react';
import { MotionValue, useReducedMotion, useScroll, useTransform } from 'framer-motion';

// Fractional scroll-progress at which each of the 6 slides begins. Must be the same length as
// SEVERITY_TINT/HAZE_OPACITY below - useTransform requires matching input/output array lengths.
// Slide order: 0 how-it-feels, 1 monthly-particle-bars, 2 city-simulation, 3 recovery,
// 4 small-things, 5 closing. The compact intro line sits outside the snap-scrolling slide deck,
// so it's no longer one of the stops.
export const BEAT_STOPS = [0, 0.2, 0.4, 0.6, 0.8, 1];

// Standard AQI severity scale (same hex values as HomePage.tsx's AQI_BANDS), used here to tint
// the scroll-driven background glow rather than to color any factual chart element.
export const SEVERITY_TINT = [
  '#f97316', // 0 how it feels to live here - Sensitive Groups
  '#a855f7', // 1 twelve months, in particles - Very Unhealthy
  '#ef4444', // 2 simulate the next years - Unhealthy (partial relief)
  '#eab308', // 3 recovery - Moderate
  '#22c55e', // 4 small things - Good
  '#7ab8e6', // 5 closing - var(--ss-accent), decoupled from severity
];

export const HAZE_OPACITY = [0.5, 0.58, 0.48, 0.22, 0.16, 0.06];

export type ScrollGrade = {
  scrollYProgress: MotionValue<number>;
  tint: MotionValue<string> | string;
  haze: MotionValue<number> | number;
  prefersReducedMotion: boolean;
};

// `containerRef` is the nested scroll-snap slide deck when one is in use (its own internal
// scrollTop drives the grade); falling back to `target`+document-scroll offsets keeps this hook
// usable without one.
export function useAgenticScrollGrade(
  sectionRef: RefObject<HTMLElement>,
  containerRef?: RefObject<HTMLElement>
): ScrollGrade {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const { scrollYProgress } = useScroll(
    containerRef ? { container: containerRef } : { target: sectionRef, offset: ['start start', 'end end'] }
  );

  const tint = useTransform(scrollYProgress, BEAT_STOPS, SEVERITY_TINT);
  const haze = useTransform(scrollYProgress, BEAT_STOPS, HAZE_OPACITY);

  // Under reduced motion, freeze both to one static mid-severity frame instead of animating
  // continuously - a one-shot opacity fade elsewhere is fine, but a persistently shifting hue
  // and drifting haze are exactly the class of motion prefers-reduced-motion asks us to avoid.
  const staticTint = SEVERITY_TINT[1];
  const staticHaze = HAZE_OPACITY[1];

  return {
    scrollYProgress,
    tint: prefersReducedMotion ? staticTint : tint,
    haze: prefersReducedMotion ? staticHaze : haze,
    prefersReducedMotion,
  };
}
