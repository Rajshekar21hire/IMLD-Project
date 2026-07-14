import React, { useState } from 'react';
import { storyAPI } from '../services/api';

const TEXT = '#232323';
const MUTED = '#8b8780';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";

const SOURCES = [
  { key: 'traffic', label: 'Traffic', duration: '9s' },
  { key: 'kilns', label: 'Kilns', duration: '11s' },
  { key: 'cooking', label: 'Cooking smoke', duration: '8s' },
  { key: 'crop-burning', label: 'Crop burning', duration: '10s' },
  { key: 'dust', label: 'Dust', duration: '9.5s' },
];

const CLOUD_GLOW = 'rgba(224,242,254,0.9)';
const CLOUD_BASE = 'rgba(125,211,252,0.5)';
const CLOUD_SIZE = 128;

function popupPlacement(index: number, total: number) {
  const horizontal: 'left' | 'center' | 'right' = index === 0 ? 'left' : index === total - 1 ? 'right' : 'center';
  return horizontal;
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
        className="relative mx-auto overflow-hidden"
        style={{
          minHeight: '340px',
          maxWidth: '900px',
          borderRadius: '24px',
          background:
            'radial-gradient(900px circle at 12% -15%, rgba(224,242,254,0.95) 0%, transparent 60%), radial-gradient(700px circle at 90% 115%, rgba(186,230,253,0.75) 0%, transparent 55%), linear-gradient(160deg, #eaf7fd 0%, #dcf0fa 45%, #c9e6f6 100%)',
          border: '1px solid rgba(125,211,252,0.35)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 12px 34px rgba(56,189,248,0.14)',
        }}
      >
        <div className="wita-glow-a pointer-events-none absolute" aria-hidden="true" style={{ top: '-60px', left: '-40px', width: 220, height: 220, borderRadius: '9999px', background: 'radial-gradient(circle, rgba(191,233,255,0.55) 0%, transparent 70%)', filter: 'blur(6px)' }} />
        <div className="wita-glow-b pointer-events-none absolute" aria-hidden="true" style={{ bottom: '-70px', right: '-30px', width: 260, height: 260, borderRadius: '9999px', background: 'radial-gradient(circle, rgba(147,197,253,0.4) 0%, transparent 70%)', filter: 'blur(8px)' }} />

        <div className="relative z-10 flex flex-wrap items-center justify-evenly gap-6 px-6 py-14 sm:px-10">
          {SOURCES.map((s, index) => {
            const open = openKey === s.key;
            const horizontal = popupPlacement(index, SOURCES.length);
            return (
              <div
                key={s.key}
                className="wita-cloud relative cursor-pointer"
                style={{
                  width: CLOUD_SIZE,
                  height: CLOUD_SIZE * 0.72,
                  animationDuration: s.duration,
                  zIndex: open ? 20 : 1,
                }}
                onClick={() => handleClick(s.key)}
                onMouseEnter={() => handleHover(s.key)}
              >
                <div
                  className="absolute inset-0 transition-transform duration-500"
                  style={{ transform: open ? 'scale(1.12)' : 'scale(1)' }}
                >
                  <div
                    className="absolute inset-0 border border-white/70 backdrop-blur-sm transition-shadow duration-300"
                    style={{
                      background: `radial-gradient(circle at 32% 28%, ${CLOUD_GLOW} 0%, ${CLOUD_BASE} 78%)`,
                      borderRadius: '60% 40% 55% 45% / 55% 45% 60% 40%',
                      boxShadow: open ? '0 16px 36px rgba(56,189,248,0.32)' : '0 8px 22px rgba(56,189,248,0.18)',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-center">
                    <span className="px-3 text-sm font-semibold" style={{ color: '#0c4a6e' }}>
                      {s.label}
                    </span>
                  </div>
                </div>

                {open && (
                  <div
                    className="absolute w-56 rounded-2xl bg-white px-4 py-3 text-left shadow-xl transition-opacity duration-300"
                    style={{
                      top: '100%',
                      marginTop: 14,
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
      </div>
      <div className="mt-3 text-sm" style={{ color: MUTED }}>Click a cloud to learn more.</div>

      <style>{`
        .wita-cloud {
          animation-name: wita-drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes wita-drift {
          0% { transform: translate(0px, 0px); }
          50% { transform: translate(8px, -10px); }
          100% { transform: translate(0px, 0px); }
        }
        .wita-glow-a {
          animation: wita-glow-drift-a 14s ease-in-out infinite;
        }
        .wita-glow-b {
          animation: wita-glow-drift-b 18s ease-in-out infinite;
        }
        @keyframes wita-glow-drift-a {
          0%, 100% { transform: translate(0px, 0px); }
          50% { transform: translate(20px, 14px); }
        }
        @keyframes wita-glow-drift-b {
          0%, 100% { transform: translate(0px, 0px); }
          50% { transform: translate(-16px, -12px); }
        }
      `}</style>
    </div>
  );
};
