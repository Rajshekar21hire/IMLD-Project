import React, { useState, useEffect } from 'react';

const CloudBackground: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // SVG Cloud shape
  const CloudSVG = ({ size }: { size: 'small' | 'medium' | 'large' }) => {
    const sizeMap = {
      small: { w: 160, h: 80 },
      medium: { w: 240, h: 120 },
      large: { w: 320, h: 160 },
    };
    const dim = sizeMap[size];
    
    return (
      <svg viewBox="0 0 200 100" className="w-full h-full text-white" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}>
        <path
          fill="currentColor"
          d="M50,80 Q20,80 20,60 Q20,40 40,40 Q50,20 70,20 Q90,20 95,40 Q120,40 120,60 Q120,80 100,80 Z"
        />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-blue-100 to-sky-50" />

      {/* Cloud 1 - Slowest (most distant) */}
      <div
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        className="absolute top-12 left-10"
      >
        <div className="w-80 h-40 opacity-50">
          <CloudSVG size="large" />
        </div>
      </div>

      {/* Cloud 2 - Medium speed */}
      <div
        style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        className="absolute top-40 right-20"
      >
        <div className="w-72 h-36 opacity-60">
          <CloudSVG size="medium" />
        </div>
      </div>

      {/* Cloud 3 - Faster speed */}
      <div
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        className="absolute top-64 left-1/4"
      >
        <div className="w-64 h-32 opacity-45">
          <CloudSVG size="medium" />
        </div>
      </div>

      {/* Cloud 4 - Even faster */}
      <div
        style={{ transform: `translateY(${scrollY * 0.6}px)` }}
        className="absolute top-80 right-1/3"
      >
        <div className="w-56 h-28 opacity-55">
          <CloudSVG size="small" />
        </div>
      </div>

      {/* Cloud 5 - Fastest (most prominent) */}
      <div
        style={{ transform: `translateY(${scrollY * 0.7}px)` }}
        className="absolute top-96 left-1/2 -translate-x-1/2"
      >
        <div className="w-80 h-40 opacity-65">
          <CloudSVG size="large" />
        </div>
      </div>
    </div>
  );
};

export default CloudBackground;
