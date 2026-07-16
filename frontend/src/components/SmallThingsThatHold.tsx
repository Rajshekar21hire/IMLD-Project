import React, { useEffect, useRef, useState } from 'react';
import { storyAPI } from '../services/api';
import { AgenticTypingDots } from './AgenticTypingDots';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';
const PANEL_BG = 'rgba(255,255,255,0.86)';
const SERIF = 'inherit';

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

// Light, glassy tints - colourful but airy, so the card row feels like frosted glass sitting
// on the page's own background rather than a block of solid, opaque colour.
const CARD_THEMES = [
  { from: 'rgba(251,113,133,0.28)', to: 'rgba(244,63,94,0.16)', glow: 'rgba(251,113,133,0.25)', accent: '#e11d48' },
  { from: 'rgba(251,191,36,0.28)', to: 'rgba(245,158,11,0.16)', glow: 'rgba(251,191,36,0.25)', accent: '#b45309' },
  { from: 'rgba(52,211,153,0.28)', to: 'rgba(5,150,105,0.16)', glow: 'rgba(52,211,153,0.25)', accent: '#047857' },
  { from: 'rgba(56,189,248,0.28)', to: 'rgba(2,132,199,0.16)', glow: 'rgba(56,189,248,0.25)', accent: '#0369a1' },
  { from: 'rgba(167,139,250,0.28)', to: 'rgba(124,58,237,0.16)', glow: 'rgba(167,139,250,0.25)', accent: '#6d28d9' },
  { from: 'rgba(251,146,60,0.28)', to: 'rgba(234,88,12,0.16)', glow: 'rgba(251,146,60,0.25)', accent: '#c2410c' },
];

export const SmallThingsThatHold: React.FC = () => {
  // Start populated with the fallback facts and already visible, so the row of cards renders
  // immediately instead of waiting on the Ollama round trip. AI-generated facts quietly swap in
  // over the fallback text once they arrive.
  const [facts, setFacts] = useState<string[]>(FALLBACK_FACTS);
  const [selected, setSelected] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, string>>({});
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const requestIds = useRef<Record<number, number>>({});
  const trackRef = useRef<HTMLDivElement>(null);

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

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('[data-sttb-card]');
    const step = (card?.offsetWidth ?? 220) + 16;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition-transform hover:scale-110"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid var(--ss-border)', color: TEXT }}
          aria-label="Scroll left"
        >
          ‹
        </button>

        <div
          ref={trackRef}
          className="sttb-track flex flex-1 gap-4 overflow-x-auto px-1 py-3"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {CARD_THEMES.map((theme, index) => {
            const isSelected = selected === index;
            return (
              <button
                key={index}
                type="button"
                data-sttb-card
                onClick={() => handleSelect(index)}
                className="sttb-card flex shrink-0 flex-col justify-between rounded-2xl px-5 py-5 text-left backdrop-blur-md transition-transform"
                style={{
                  width: 230,
                  minHeight: 160,
                  scrollSnapAlign: 'start',
                  background: `linear-gradient(150deg, ${theme.from} 0%, ${theme.to} 100%)`,
                  boxShadow: isSelected ? `0 14px 32px ${theme.glow}` : `0 6px 18px ${theme.glow}`,
                  transform: isSelected ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
                  border: isSelected ? `2px solid ${theme.accent}55` : '2px solid rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}
                aria-pressed={isSelected}
              >
                <span className="text-sm font-semibold leading-snug" style={{ fontFamily: SERIF, color: TEXT }}>
                  {facts[index] || FALLBACK_FACTS[index]}
                </span>
                <span className="mt-4 text-xs font-bold uppercase tracking-widest" style={{ color: theme.accent }}>
                  {isSelected ? 'Selected' : 'Tap to open'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollByCard(1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition-transform hover:scale-110"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid var(--ss-border)', color: TEXT }}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>

      <div className="mt-2 text-center text-xs" style={{ color: MUTED }}>
        Drag, scroll, or use the arrows - tap a card to sit with it a little longer.
      </div>

      <div className="mx-auto mt-5 w-full max-w-xl text-left">
        <div className="min-h-[120px] rounded-2xl px-5 py-4" style={{ backgroundColor: PANEL_BG, border: '1px solid var(--ss-border)' }}>
          {selected === null && (
            <div className="text-base" style={{ color: MUTED }}>
              Click a memory above to sit with it a little longer.
            </div>
          )}
          {selected !== null && loadingIndex === selected && <AgenticTypingDots />}
          {selected !== null && loadingIndex !== selected && (
            <div className="text-lg leading-relaxed" style={{ fontFamily: SERIF, color: TEXT }}>
              {details[selected]}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .sttb-track {
          scrollbar-width: thin;
        }
        .sttb-track::-webkit-scrollbar {
          height: 6px;
        }
        .sttb-track::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.4);
          border-radius: 9999px;
        }
        .sttb-card:hover {
          transform: translateY(-4px) scale(1.02);
        }
      `}</style>
    </div>
  );
};
