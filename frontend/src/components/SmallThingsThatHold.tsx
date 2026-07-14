import React, { useEffect, useRef, useState } from 'react';
import { storyAPI } from '../services/api';

const TEXT = '#3a3733';
const MUTED = '#8b8780';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";

const FALLBACK_FACTS = [
  'Children breathe faster than adults, so they take in more of the same air.',
  "The air you're breathing today was somewhere else last week.",
  'A closed window keeps out more than it keeps in.',
  'Plants clean the air a little, all day, without being asked.',
  'The same sky sits over every house on your street.',
  'Clean air has no smell at all - that itself is a kind of news.',
];

const FALLBACK_DETAILS = [
  "That's why a child playing outside carries a heavier share of the same bad air than the adult standing next to them.",
  "It drifted over farms, rivers, and other cities before it ever reached your window - pollution doesn't stay where it starts.",
  'Fresh air still finds its way in through gaps and doorways, a little at a time, all day long.',
  "It's not enough to fix the problem alone, but it's never nothing - every leaf is doing some quiet, unpaid work.",
  "It doesn't ask what street you live on, which is exactly why the fix has to reach every street too.",
  "So on a good day, the quiet itself is the story - nothing to smell means there's nothing to notice.",
];

const NODE_COLORS = [
  { fill: '#8fa77c', glow: 'rgba(143,167,124,0.35)' },
  { fill: '#c9a86a', glow: 'rgba(201,168,106,0.35)' },
  { fill: '#c17f5e', glow: 'rgba(193,127,94,0.32)' },
  { fill: '#5b9aa8', glow: 'rgba(91,154,168,0.32)' },
  { fill: '#c9a86a', glow: 'rgba(201,168,106,0.3)' },
  { fill: '#8fa77c', glow: 'rgba(143,167,124,0.3)' },
];

const HUB = { x: 50, y: 50 };
const NODE_COUNT = 6;
const RADIUS = 38;

function nodePosition(index: number) {
  const angle = (index / NODE_COUNT) * 2 * Math.PI - Math.PI / 2;
  return {
    x: HUB.x + RADIUS * Math.cos(angle),
    y: HUB.y + RADIUS * Math.sin(angle),
  };
}

const TypingDots: React.FC = () => (
  <span className="sttb-typing" aria-label="thinking">
    <span />
    <span />
    <span />
  </span>
);

export const SmallThingsThatHold: React.FC = () => {
  // Start populated with the fallback facts and already visible, so the graph (rings, hub, and
  // bubbles) renders immediately instead of waiting on the Ollama round trip - a slow or queued
  // generation used to leave only the centre hub on screen for several seconds. AI-generated
  // facts quietly swap in over the fallback text once they arrive.
  const [facts, setFacts] = useState<string[]>(FALLBACK_FACTS);
  const [visible, setVisible] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, string>>({});
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const requestIds = useRef<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await storyAPI.agenticBubbles({});
        if (!cancelled && res.data?.success) {
          setFacts(res.data.data.facts);
        }
      } catch {
        // Fallback facts are already showing - nothing further to do.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (index: number) => {
    setSelected(index);
    if (details[index] !== undefined) return;

    const myId = (requestIds.current[index] || 0) + 1;
    requestIds.current[index] = myId;
    setLoadingIndex(index);

    const fact = facts[index] || FALLBACK_FACTS[index];
    storyAPI
      .agenticFactDetail({ fact })
      .then((res) => {
        if (requestIds.current[index] !== myId) return;
        const detail = res.data?.success ? res.data.data.detail : FALLBACK_DETAILS[index];
        setDetails((prev) => ({ ...prev, [index]: detail }));
      })
      .catch(() => {
        if (requestIds.current[index] !== myId) return;
        setDetails((prev) => ({ ...prev, [index]: FALLBACK_DETAILS[index] }));
      })
      .finally(() => {
        if (requestIds.current[index] !== myId) return;
        setLoadingIndex(null);
      });
  };

  return (
    <div className="flex flex-col items-center gap-10 md:flex-row md:items-start">
      <div className="relative mx-auto shrink-0" style={{ height: '460px', width: '100%', maxWidth: '460px' }}>
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 600ms' }}
          aria-hidden="true"
        >
          {NODE_COLORS.map((_, index) => {
            const pos = nodePosition(index);
            const next = nodePosition((index + 1) % NODE_COUNT);
            const isActiveSpoke = selected === index;
            return (
              <g key={`ring-${index}`}>
                <line
                  x1={pos.x}
                  y1={pos.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="rgba(139,135,128,0.22)"
                  strokeWidth={0.4}
                />
                <line
                  x1={HUB.x}
                  y1={HUB.y}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={isActiveSpoke ? NODE_COLORS[index].fill : 'rgba(139,135,128,0.28)'}
                  strokeWidth={isActiveSpoke ? 0.9 : 0.4}
                  className={isActiveSpoke ? 'sttb-spoke-active' : ''}
                />
              </g>
            );
          })}
        </svg>

        <button
          type="button"
          className="sttb-hub absolute flex items-center justify-center rounded-full text-center shadow-[0_6px_20px_rgba(58,55,51,0.18)]"
          style={{
            width: 96,
            height: 96,
            top: `${HUB.y}%`,
            left: `${HUB.x}%`,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle at 35% 30%, #fff 0%, #eef0eb 70%)',
            border: '1.5px solid rgba(58,55,51,0.15)',
          }}
          aria-label="Small things that hold - centre"
        >
          <span className="px-2 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: MUTED }}>
            What holds
          </span>
        </button>

        {NODE_COLORS.map((color, index) => {
          const pos = nodePosition(index);
          const isSelected = selected === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              className="sttb-bubble absolute flex items-center justify-center rounded-full text-center transition-all"
              style={{
                width: 118,
                height: 118,
                top: `${pos.y}%`,
                left: `${pos.x}%`,
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle at 32% 28%, #fff 0%, ${color.glow} 55%, ${color.fill}55 100%)`,
                opacity: visible ? 1 : 0,
                transitionDuration: '600ms',
                transitionDelay: `${index * 150}ms`,
                border: isSelected ? `2px solid ${color.fill}` : '2px solid rgba(255,255,255,0.6)',
                boxShadow: isSelected
                  ? `0 10px 26px ${color.glow}`
                  : '0 4px 14px rgba(58,55,51,0.1)',
                cursor: 'pointer',
                zIndex: isSelected ? 5 : 1,
              }}
            >
              <span
                className="sttb-text px-4 text-sm leading-snug transition-colors duration-300"
                style={{ fontFamily: SERIF, color: TEXT }}
              >
                {facts[index] || FALLBACK_FACTS[index]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="w-full max-w-sm text-left">
        <div className="min-h-[160px] rounded-2xl bg-slate-50 px-5 py-4">
          {selected === null && (
            <div className="text-base" style={{ color: MUTED }}>
              Click a memory to sit with it a little longer.
            </div>
          )}
          {selected !== null && loadingIndex === selected && <TypingDots />}
          {selected !== null && loadingIndex !== selected && (
            <div className="text-lg leading-relaxed" style={{ fontFamily: SERIF, color: TEXT }}>
              {details[selected]}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .sttb-bubble {
          animation-name: sttb-pulse;
          animation-duration: 5s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .sttb-bubble:hover {
          transform: translate(-50%, -50%) scale(1.06);
        }
        .sttb-bubble:hover .sttb-text {
          color: #14130f;
        }
        @keyframes sttb-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.03); }
        }
        .sttb-hub {
          animation: sttb-hub-glow 3.5s ease-in-out infinite;
        }
        @keyframes sttb-hub-glow {
          0%, 100% { box-shadow: 0 6px 20px rgba(58,55,51,0.18); }
          50% { box-shadow: 0 8px 28px rgba(14,165,233,0.22); }
        }
        .sttb-spoke-active {
          stroke-dasharray: 2 1.4;
          animation: sttb-flow 1.2s linear infinite;
        }
        @keyframes sttb-flow {
          to { stroke-dashoffset: -6.8; }
        }
        .sttb-typing { display: inline-flex; gap: 4px; align-items: center; height: 24px; }
        .sttb-typing span {
          width: 6px; height: 6px; border-radius: 50%;
          background-color: #94a3b8;
          animation: sttb-bounce 1.2s infinite ease-in-out;
        }
        .sttb-typing span:nth-child(2) { animation-delay: 0.15s; }
        .sttb-typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes sttb-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
