import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  accent: string;
  children: React.ReactNode;
  className?: string;
};

// Replacement for AgenticCard.tsx (that component stays in place for other call sites, but
// nothing in the rebuilt Agentic AI section uses it any more - the boxed-card layout is what
// this rebuild removes). Keeps the same whileInView reveal idiom used everywhere else on the
// site, but drops the fixed rounded-card chrome in favour of a full-bleed section that sits
// directly on the scroll-graded light canvas.
export const AgenticBeat: React.FC<Props> = ({ eyebrow, title, accent, children, className }) => {
  const prefersReducedMotion = useReducedMotion();

  const initial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 };
  const whileInView = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <motion.section
      initial={initial}
      whileInView={whileInView}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={className ?? 'relative z-[1] mx-auto w-full px-0 py-16 md:px-0'}
    >
      <div className="flex items-center justify-center gap-2.5 text-center">
        <span className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: '#0C447C' }}>
          {eyebrow}
        </span>
      </div>
      <h3
        className="mt-3 text-center text-4xl font-black leading-[1.02] tracking-tight md:text-6xl"
        style={{ color: 'var(--ss-text)' }}
      >
        {title}
      </h3>
      <div className="mt-6">{children}</div>
    </motion.section>
  );
};
