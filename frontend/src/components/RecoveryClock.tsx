import React, { useEffect, useRef, useState } from 'react';
import { storyAPI } from '../services/api';

type Arc = {
  id: string;
  label: string;
  timescale: string;
  facts: string;
};

const ARCS: Arc[] = [
  {
    id: 'stove',
    label: 'Clean Cookstove',
    timescale: 'Day 1',
    facts:
      '- Indoor PM2.5 falls over 90% on the first day of use\n- Children in clean-fuel homes have 68% fewer respiratory infections',
  },
  {
    id: 'forecast',
    label: '72-Hour Forecast',
    timescale: '3 Days',
    facts:
      '- Machine learning predicts city AQI 72 hours ahead at 90% accuracy\n- Schools can close before a hazardous day, not after it',
  },
  {
    id: 'city',
    label: 'City Policy',
    timescale: '5 Years',
    facts: '- China cut PM2.5 by 35% in major cities in 5 years\n- London ULEZ cut roadside NO2 by 44%',
  },
  {
    id: 'who',
    label: 'WHO 2030 Targets',
    timescale: '2030',
    facts: '- 3.7 million lives saved each year\n- South Asia gains an average of 5 extra years of life expectancy',
  },
];

const FALLBACKS: Record<string, string> = {
  stove:
    "A home's air clears within a single day. Indoor smoke falls more than 90% once a family switches to a clean stove, and its children catch 68% fewer breathing infections.",
  forecast:
    'A city can get ready before bad air even arrives. Machine learning predicts AQI three days out with 90% accuracy, so a school can close early, not scramble late.',
  city:
    "A city can breathe easier within one term in office. Major Chinese cities cut PM2.5 by 35% in five years, and London's low-emission zone cut roadside pollution by 44%.",
  who:
    "By 2030, this becomes millions of ordinary days, saved. The WHO's targets could protect 3.7 million lives a year, and give South Asia five more years, on average, to live them.",
};

const buildPrompt = (arc: Arc) => `You are writing one short, warm message for a data journalism page about air pollution in South Asia. The reader has just clicked on an intervention called "${arc.label}".

FACTS YOU MUST USE (do not invent numbers, do not add any others):
${arc.facts}

WRITE:
- 2 to 3 sentences. Under 55 words total.
- Simple English. Short words. A reader who learned English as a second language should understand every word.
- Warm, calm, hopeful. Speak to one person, not a crowd.
- Ground the hope in the numbers above. Do not exaggerate.
- Start with the human result, then the number.
- No headings, no bullet points, no emoji, no quotation marks.
- Do not say "imagine" or "picture this". Do not begin with "In".

Return only the message text.`;

type ArcStatus = 'idle' | 'loading' | 'streaming' | 'done';

const RADII = [46, 70, 94, 118];
const HAZY = '#c9a86a';
const CLEAR = ['#16a34a', '#22c55e', '#4ade80', '#86efac'];

const TypingDots: React.FC = () => (
  <span className="rc-typing" aria-label="thinking">
    <span />
    <span />
    <span />
  </span>
);

export const RecoveryClock: React.FC = () => {
  const [activated, setActivated] = useState<Record<string, boolean>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, ArcStatus>>({});
  const [activeArcId, setActiveArcId] = useState<string | null>(null);
  const requestIds = useRef<Record<string, number>>({});
  const revealTimers = useRef<Record<string, number | undefined>>({});

  useEffect(() => {
    return () => {
      Object.values(revealTimers.current).forEach((timerId) => {
        if (timerId !== undefined) window.clearTimeout(timerId);
      });
    };
  }, []);

  const activeCount = Object.values(activated).filter(Boolean).length;
  const activeArc = ARCS.find((a) => a.id === activeArcId) || null;

  // Reveals the already-generated text a few characters at a time so it still reads like a
  // typewriter, without needing a real streaming connection through the backend proxy.
  const revealText = (arcId: string, myId: number, full: string) => {
    let i = 0;
    const tick = () => {
      if (requestIds.current[arcId] !== myId) return;
      i += 3;
      setTexts((prev) => ({ ...prev, [arcId]: full.slice(0, i) }));
      if (i < full.length) {
        revealTimers.current[arcId] = window.setTimeout(tick, 16);
      } else {
        setStatus((prev) => ({ ...prev, [arcId]: 'done' }));
      }
    };
    tick();
  };

  const runGeneration = async (arc: Arc) => {
    const myId = (requestIds.current[arc.id] || 0) + 1;
    requestIds.current[arc.id] = myId;
    if (revealTimers.current[arc.id] !== undefined) {
      window.clearTimeout(revealTimers.current[arc.id]);
    }
    setStatus((prev) => ({ ...prev, [arc.id]: 'loading' }));
    setTexts((prev) => ({ ...prev, [arc.id]: '' }));

    try {
      const res = await storyAPI.ollamaText({ prompt: buildPrompt(arc), num_predict: 90 });
      if (requestIds.current[arc.id] !== myId) return;
      const responseText = res.data?.success ? String(res.data.data?.text || '').trim() : '';
      if (!responseText) throw new Error('empty response');
      setStatus((prev) => ({ ...prev, [arc.id]: 'streaming' }));
      revealText(arc.id, myId, responseText);
    } catch {
      if (requestIds.current[arc.id] !== myId) return;
      setTexts((prev) => ({ ...prev, [arc.id]: FALLBACKS[arc.id] }));
      setStatus((prev) => ({ ...prev, [arc.id]: 'done' }));
    }
  };

  const handleArcClick = (arc: Arc) => {
    setActiveArcId(arc.id);
    setActivated((prev) => (prev[arc.id] ? prev : { ...prev, [arc.id]: true }));
    if (texts[arc.id] !== undefined) return;
    runGeneration(arc);
  };

  const handleRegenerate = () => {
    if (!activeArc) return;
    runGeneration(activeArc);
  };

  return (
    <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-center">
      <div className="relative shrink-0" style={{ width: 280, height: 280 }}>
        <svg viewBox="0 0 280 280" width={280} height={280}>
          {ARCS.map((arc, i) => {
            const r = RADII[i];
            const isActive = Boolean(activated[arc.id]);
            const isCurrent = activeArcId === arc.id;
            return (
              <circle
                key={arc.id}
                cx={140}
                cy={140}
                r={r}
                fill="none"
                stroke={isActive ? CLEAR[i] : HAZY}
                strokeWidth={isCurrent ? 16 : 13}
                strokeLinecap="round"
                opacity={isActive ? 1 : 0.55}
                style={{
                  filter: isActive ? 'blur(0px)' : 'blur(1.5px)',
                  transition: 'stroke 800ms ease, opacity 800ms ease, filter 800ms ease, stroke-width 200ms ease',
                  cursor: 'pointer',
                }}
                onClick={() => handleArcClick(arc)}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold text-slate-900">{activeCount}</div>
          <div className="mt-1 text-center text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
            {activeCount === 1 ? 'recovery active' : 'recoveries active'}
          </div>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="flex flex-col gap-2">
          {ARCS.map((arc, i) => {
            const isActive = Boolean(activated[arc.id]);
            const isCurrent = activeArcId === arc.id;
            return (
              <button
                key={arc.id}
                type="button"
                onClick={() => handleArcClick(arc)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-200"
                style={{ backgroundColor: isCurrent ? 'rgba(22,163,74,0.08)' : 'transparent' }}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: isActive ? CLEAR[i] : HAZY, transition: 'background-color 800ms ease' }}
                />
                <span className="flex-1 text-base font-semibold text-slate-800">{arc.label}</span>
                <span className="text-sm font-medium text-slate-500">{arc.timescale}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 min-h-[88px] rounded-2xl bg-slate-50 px-5 py-4">
          {!activeArc && (
            <div className="text-base text-slate-500">
              Click a ring, or an intervention above, to watch the air clear.
            </div>
          )}
          {activeArc && status[activeArc.id] === 'loading' && <TypingDots />}
          {activeArc && status[activeArc.id] !== 'loading' && (
            <>
              <div
                className="text-lg leading-relaxed text-slate-800"
                style={{ fontFamily: "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif" }}
              >
                {texts[activeArc.id]}
                {status[activeArc.id] === 'streaming' && <span className="rc-cursor">|</span>}
              </div>
              {status[activeArc.id] === 'done' && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="mt-3 text-sm font-semibold text-emerald-700 hover:underline"
                >
                  regenerate
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .rc-typing { display: inline-flex; gap: 4px; align-items: center; height: 24px; }
        .rc-typing span {
          width: 6px; height: 6px; border-radius: 50%;
          background-color: #94a3b8;
          animation: rc-bounce 1.2s infinite ease-in-out;
        }
        .rc-typing span:nth-child(2) { animation-delay: 0.15s; }
        .rc-typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes rc-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
        .rc-cursor { animation: rc-blink 1s step-start infinite; }
        @keyframes rc-blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
};
