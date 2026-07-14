import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITY_MONTHLY_PM25, WHO_ANNUAL_GUIDELINE_PM25 } from '../data/agenticMechanismData';
import { useAgenticOllamaCaption } from './useAgenticOllamaCaption';
import { AgenticCaption } from './AgenticCaption';

const TEXT = '#232323';
const MUTED = '#8b8780';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";
const ACCENT = '#7c3aed';

// Illustrative rules of thumb, not a precise clinical model - stated as such in the caption.
const LIFE_YEARS_PER_UGM3_ABOVE_GUIDELINE = 0.08; // rough AQLI-style scaling
const UGM3_PER_CIGARETTE = 22; // Berkeley Earth's commonly-cited PM2.5-to-cigarettes rule of thumb

const delhiAnnualAvg = Math.round(
  CITY_MONTHLY_PM25.Delhi.reduce((sum, v) => sum + v, 0) / CITY_MONTHLY_PM25.Delhi.length
);
const lifeYearsLost = Math.round((delhiAnnualAvg - WHO_ANNUAL_GUIDELINE_PM25) * LIFE_YEARS_PER_UGM3_ABOVE_GUIDELINE * 10) / 10;
const cigarettesPerDay = Math.round((delhiAnnualAvg / UGM3_PER_CIGARETTE) * 10) / 10;

const FRAMINGS = [
  {
    key: 'raw',
    value: delhiAnnualAvg,
    decimals: 0,
    unit: 'µg/m³',
    heading: 'The number',
    body: "Delhi's air averages about this much fine particulate matter every single day of the year, not just on the bad days.",
  },
  {
    key: 'life',
    value: lifeYearsLost,
    decimals: 1,
    unit: 'years',
    heading: 'What it costs',
    body: 'Translate that into a lifetime of exposure and it works out to roughly this many years off the average life expectancy here.',
  },
  {
    key: 'cig',
    value: cigarettesPerDay,
    decimals: 1,
    unit: 'cigarettes / day',
    heading: 'What it feels like',
    body: "Using the rough rule of thumb that about 22 µg/m³ of PM2.5 is like one cigarette, that's what breathing this air every day compares to.",
  },
];

function useTweenedNumber(target: number, durationMs = 650) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    const from = fromRef.current;
    const to = target;

    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

const FALLBACK_CAPTION =
  "One number, three ways of feeling it. The µg/m³ figure is easy to skim past - years of life and cigarettes a day are harder to.";

export const ExposureImpactScrollytelling: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stepHeight = 220;

  const tweened = useTweenedNumber(FRAMINGS[activeIndex].value);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / stepHeight);
    const clamped = Math.max(0, Math.min(FRAMINGS.length - 1, index));
    setActiveIndex((prev) => (prev === clamped ? prev : clamped));
  };

  const goTo = (index: number) => {
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ top: index * stepHeight, behavior: 'smooth' });
  };

  const userMessage = useMemo(
    () =>
      `Chart type: scrollytelling stat morph. Same underlying exposure shown three ways: ${delhiAnnualAvg} µg/m³ PM2.5 (Delhi annual average) = ${lifeYearsLost} estimated years of life expectancy lost = ${cigarettesPerDay} cigarettes per day equivalent (illustrative rules of thumb).`,
    []
  );
  const { text: caption, status } = useAgenticOllamaCaption(userMessage, FALLBACK_CAPTION);

  const current = FRAMINGS[activeIndex];

  return (
    <div>
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <div className="flex shrink-0 items-center justify-center md:w-64" style={{ minHeight: 180 }}>
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-5xl font-extrabold tabular-nums" style={{ color: ACCENT }}>
                  {tweened.toFixed(current.decimals)}
                </div>
                <div className="mt-1 text-sm font-semibold tracking-[0.08em]" style={{ color: MUTED }}>
                  {current.unit}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="hide-scrollbar overflow-y-auto rounded-2xl bg-slate-50"
            style={{ height: stepHeight, scrollSnapType: 'y proximity' }}
          >
            {FRAMINGS.map((f) => (
              <div
                key={f.key}
                style={{ height: stepHeight, scrollSnapAlign: 'start' }}
                className="flex flex-col justify-center px-6"
              >
                <div className="text-sm font-bold uppercase tracking-[0.15em]" style={{ color: ACCENT }}>
                  {f.heading}
                </div>
                <div className="mt-2 text-lg leading-relaxed" style={{ fontFamily: SERIF, color: TEXT }}>
                  {f.body}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-center gap-2">
            {FRAMINGS.map((f, i) => (
              <button
                key={f.key}
                type="button"
                onClick={() => goTo(i)}
                aria-pressed={activeIndex === i}
                aria-label={`Show as ${f.heading.toLowerCase()}`}
                className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                style={{
                  background: activeIndex === i ? ACCENT : '#fff',
                  color: activeIndex === i ? '#fff' : MUTED,
                  border: `1.5px solid ${activeIndex === i ? ACCENT : '#e2ddd2'}`,
                }}
              >
                {f.heading}
              </button>
            ))}
          </div>
          <div className="mt-1 text-center text-xs" style={{ color: MUTED }}>
            Scroll the box above, or use the buttons, to step through each framing.
          </div>
        </div>
      </div>

      <AgenticCaption text={caption} loading={status === 'loading'} generated={status === 'done'} />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { width: 0; height: 0; }
        .hide-scrollbar { scrollbar-width: none; }
      `}</style>
    </div>
  );
};
