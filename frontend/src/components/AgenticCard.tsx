import React from 'react';
import { motion } from 'framer-motion';

type Props = {
  eyebrow: string;
  title: string;
  accent: string;
  children: React.ReactNode;
};

export const AgenticCard: React.FC<Props> = ({ eyebrow, title, accent, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className="mt-8 rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_4px_28px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_44px_rgba(0,0,0,0.09)] md:p-10"
  >
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
      <span className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
        {eyebrow}
      </span>
    </div>
    <h3 className="mt-3 text-2xl font-extrabold text-slate-900 md:text-3xl">{title}</h3>
    <div className="mt-7">{children}</div>
  </motion.div>
);
