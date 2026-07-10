import React, { useMemo } from 'react';

type Speck = {
  left: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
};

const createSpecks = (count: number): Speck[] => {
  return Array.from({ length: count }, () => {
    const size = 2 + Math.random() * 3;
    const duration = 14 + Math.random() * 10;
    return {
      left: `${Math.random() * 100}%`,
      size,
      duration,
      delay: Math.random() * duration,
      opacity: 0.22 + Math.random() * 0.25,
      drift: -10 + Math.random() * 20,
    };
  });
};

export const SkyBackground: React.FC = () => {
  const specks = useMemo(() => createSpecks(18), []);

  return (
    <div className="sky-bg" aria-hidden="true" role="presentation">
      <div className="sky-wash" />

      <div className="sky-cloud sky-cloud-1" />
      <div className="sky-cloud sky-cloud-2" />
      <div className="sky-cloud sky-cloud-3" />
      <div className="sky-cloud sky-cloud-4" />
      <div className="sky-cloud sky-cloud-5" />

      {specks.map((speck, index) => (
        <div
          key={index}
          className="sky-speck"
          style={{
            left: speck.left,
            width: `${speck.size}px`,
            height: `${speck.size}px`,
            opacity: speck.opacity,
            animationDuration: `${speck.duration}s`,
            animationDelay: `-${speck.delay}s`,
            '--speck-drift': `${speck.drift}vw`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default SkyBackground;