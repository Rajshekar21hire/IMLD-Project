import React from 'react';
import { motion, MotionValue } from 'framer-motion';
import { FogDriftLayer } from './FogDriftLayer';

type Props = {
  tint: MotionValue<string> | string;
  haze: MotionValue<number> | number;
  prefersReducedMotion: boolean;
};

// Ambient scroll-graded backdrop for the Agentic AI section: a soft colour wash tied to scroll
// position (see useAgenticScrollGrade) plus the shared FogDriftLayer motif. Purely atmospheric -
// no interactive elements here, so it never competes with the actual content in each beat.
export const AgenticHazeLayer: React.FC<Props> = ({ tint, haze, prefersReducedMotion }) => {
  return (
    <motion.div
      aria-hidden="true"
      className="agentic-haze-root"
      style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', opacity: haze }}
    >
      <FogDriftLayer />

      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-10% -10% 40% -10%',
          background: tint,
          opacity: 0.1,
          mixBlendMode: 'multiply',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
};
