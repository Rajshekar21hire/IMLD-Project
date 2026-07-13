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

const LAYOUT = [
  { size: 150, top: '4%', left: '4%', fill: 'rgba(143,167,124,0.35)', duration: '9s' },
  { size: 110, top: '2%', left: '58%', fill: 'rgba(201,168,106,0.35)', duration: '11s' },
  { size: 130, top: '38%', left: '30%', fill: 'rgba(193,127,148,0.3)', duration: '10s' },
  { size: 100, top: '46%', left: '68%', fill: 'rgba(143,180,194,0.35)', duration: '8s' },
  { size: 120, top: '62%', left: '2%', fill: 'rgba(201,168,106,0.3)', duration: '12s' },
  { size: 105, top: '74%', left: '56%', fill: 'rgba(143,167,124,0.3)', duration: '9.5s' },
];

const TypingDots: React.FC = () => (
  <span className="sttb-typing" aria-label="thinking">
    <span />
    <span />
    <span />
  </span>
);

export const SmallThingsThatHold: React.FC = () => {
  const [facts, setFacts] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
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
        } else if (!cancelled) {
          setFacts(FALLBACK_FACTS);
        }
      } catch {
        if (!cancelled) setFacts(FALLBACK_FACTS);
      } finally {
        if (!cancelled) setVisible(true);
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
      <div className="relative mx-auto shrink-0" style={{ height: '420px', width: '100%', maxWidth: '460px' }}>
        {LAYOUT.map((pos, index) => {
          const isSelected = selected === index;
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              className="sttb-bubble absolute flex items-center justify-center rounded-full text-center transition-opacity"
              style={{
                width: pos.size,
                height: pos.size,
                top: pos.top,
                left: pos.left,
                backgroundColor: pos.fill,
                animationDuration: pos.duration,
                opacity: visible ? 1 : 0,
                transitionDuration: '600ms',
                transitionDelay: `${index * 300}ms`,
                border: isSelected ? '2px solid rgba(58,55,51,0.5)' : '2px solid transparent',
                cursor: 'pointer',
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
          animation-name: sttb-float;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .sttb-bubble:hover {
          transform: translateY(-4px);
        }
        .sttb-bubble:hover .sttb-text {
          color: #14130f;
        }
        @keyframes sttb-float {
          0%, 100% { margin-top: 0px; }
          50% { margin-top: -10px; }
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
