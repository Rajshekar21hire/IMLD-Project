import React, { useState } from 'react';
import { storyAPI } from '../services/api';

const TEXT = '#232323';
const MUTED = '#8b8780';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";

const SOURCES = [
  { key: 'traffic', label: 'Traffic', share: 34, base: '#3b82f6', glow: '#bfdbfe', top: '10%', left: '8%', duration: '32s' },
  { key: 'kilns', label: 'Kilns', share: 20, base: '#ea580c', glow: '#fed7aa', top: '38%', left: '55%', duration: '38s' },
  { key: 'cooking', label: 'Cooking smoke', share: 14, base: '#d97706', glow: '#fde68a', top: '62%', left: '20%', duration: '28s' },
  { key: 'crop-burning', label: 'Crop burning', share: 22, base: '#dc2626', glow: '#fecaca', top: '15%', left: '60%', duration: '34s' },
  { key: 'dust', label: 'Dust', share: 10, base: '#65a30d', glow: '#d9f99d', top: '55%', left: '68%', duration: '26s' },
];

function popupPlacement(top: string, left: string) {
  const topNum = parseFloat(top);
  const leftNum = parseFloat(left);
  const vertical: 'above' | 'below' = topNum < 30 ? 'below' : 'above';
  const horizontal: 'left' | 'center' | 'right' = leftNum < 20 ? 'left' : leftNum > 65 ? 'right' : 'center';
  return { vertical, horizontal };
}

export const WhatsInTheAir: React.FC = () => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, string>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleClick = async (key: string) => {
    const willOpen = openKey !== key;
    setOpenKey(willOpen ? key : null);
    if (!willOpen || lines[key]) return;
    setLoadingKey(key);
    try {
      const res = await storyAPI.agenticCloud({ source: key });
      if (res.data?.success) {
        setLines((current) => ({ ...current, [key]: res.data.data.line }));
      }
    } catch {
      // quiet failure - the popup simply stays empty
    } finally {
      setLoadingKey(null);
    }
  };

  const handleHover = (key: string) => {
    if (openKey && openKey !== key) setOpenKey(null);
  };

  return (
    <div className="text-center">
      <div
        className="relative mx-auto"
        style={{ height: '380px', maxWidth: '580px', background: 'linear-gradient(180deg, #eef5f8 0%, #e6eef4 100%)', borderRadius: '20px' }}
      >
        {SOURCES.map((s) => {
          const size = 60 + s.share * 3;
          const open = openKey === s.key;
          const { vertical, horizontal } = popupPlacement(s.top, s.left);
          return (
            <div
              key={s.key}
              className="wita-cloud absolute cursor-pointer transition-transform duration-500"
              style={{
                top: s.top,
                left: s.left,
                width: size,
                height: size * 0.7,
                animationDuration: s.duration,
                transform: open ? 'scale(1.12)' : 'scale(1)',
                zIndex: open ? 20 : 1,
              }}
              onClick={() => handleClick(s.key)}
              onMouseEnter={() => handleHover(s.key)}
            >
              <div
                className="absolute inset-0 transition-shadow duration-300"
                style={{
                  background: `radial-gradient(circle at 32% 28%, ${s.glow} 0%, ${s.base} 72%)`,
                  borderRadius: '60% 40% 55% 45% / 55% 45% 60% 40%',
                  filter: 'blur(1.5px)',
                  opacity: 0.92,
                  boxShadow: open ? '0 14px 34px rgba(15,23,42,0.22)' : '0 8px 22px rgba(15,23,42,0.14)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <span className="px-3 text-sm font-semibold" style={{ color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>
                  {s.label}
                </span>
              </div>

              {open && (
                <div
                  className="absolute w-56 rounded-2xl bg-white px-4 py-3 text-left shadow-xl transition-opacity duration-300"
                  style={{
                    ...(vertical === 'above' ? { bottom: '100%', marginBottom: 14 } : { top: '100%', marginTop: 14 }),
                    ...(horizontal === 'left'
                      ? { left: 0 }
                      : horizontal === 'right'
                      ? { right: 0 }
                      : { left: '50%', transform: 'translateX(-50%)' }),
                    opacity: loadingKey === s.key ? 0.5 : 1,
                    zIndex: 30,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-sm leading-snug" style={{ fontFamily: SERIF, color: TEXT }}>
                    {lines[s.key] || (loadingKey === s.key ? '…' : '')}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-sm" style={{ color: MUTED }}>Click a cloud to learn more.</div>

      <style>{`
        .wita-cloud {
          animation-name: wita-drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes wita-drift {
          0% { margin-left: 0px; margin-top: 0px; }
          50% { margin-left: 12px; margin-top: -8px; }
          100% { margin-left: 0px; margin-top: 0px; }
        }
      `}</style>
    </div>
  );
};
