import React, { useState } from 'react';
import { storyAPI } from '../services/api';
import { WhoAreYouAskingFor, AGENTIC_CLOSING_CITIES, AGENTIC_CLOSING_CITY_COUNTRY } from './WhoAreYouAskingFor';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';
const ACCENT = '#0284c7';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";

const CITY_PALETTE = ['#8fa77c', '#c9a86a', '#c17f5e', '#5b9aa8', '#a78bfa', '#e08a86', '#7bc9b8'];
const colorForCity = (city: string) => CITY_PALETTE[AGENTIC_CLOSING_CITIES.indexOf(city) % CITY_PALETTE.length] || CITY_PALETTE[0];

type Comparison = { city: string; line: string };
type Result = {
  meaning?: string;
  action?: string;
  comparisons?: Comparison[];
  phrase?: string;
};

// A pre-warmed cache can answer all four calls below in well under a second combined, which
// reads as "this was already here," not "written just now." Holding the loading state open this
// long keeps the "Writing something for..." moment legible regardless of where the text came from.
const MIN_VISIBLE_LOADING_MS = 1400;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function settle<T>(res: PromiseSettledResult<any>, extract: (data: any) => T, fallback: T): T {
  if (res.status === 'fulfilled' && res.value?.data?.success) {
    try {
      return extract(res.value.data.data);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export const PersonalizedClosing: React.FC = () => {
  const [city, setCity] = useState<string | null>(null);
  const [forWhom, setForWhom] = useState<string | null>(null);
  const [concern, setConcern] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [result, setResult] = useState<Result>({});

  const allSelected = Boolean(city && forWhom && concern);

  const generate = async () => {
    if (!city || !forWhom || !concern) return;
    setStatus('loading');
    const args = { city, for_whom: forWhom, concern };
    const startedAt = Date.now();

    const [meaning, action, neighbours, breath] = await Promise.allSettled([
      storyAPI.agenticMeaning(args),
      storyAPI.agenticAction(args),
      storyAPI.agenticNeighbours(args),
      storyAPI.agenticBreath(args),
    ]);

    await wait(Math.max(0, MIN_VISIBLE_LOADING_MS - (Date.now() - startedAt)));

    setResult({
      meaning: settle(meaning, (d) => String(d.meaning), 'Some places carry more of this than others - yours may be one of them today.'),
      action: settle(action, (d) => String(d.action), 'Open a window for a few minutes when the street outside sounds quiet.'),
      comparisons: settle(neighbours, (d) => d.comparisons as Comparison[], []),
      phrase: settle(breath, (d) => String(d.phrase), 'Today the air here asks for a little patience.'),
    });
    setStatus('done');
  };

  const reset = () => {
    setCity(null);
    setForWhom(null);
    setConcern(null);
    setStatus('idle');
    setResult({});
  };

  return (
    <div>
      <WhoAreYouAskingFor
        city={city}
        forWhom={forWhom}
        concern={concern}
        onSelectCity={setCity}
        onSelectForWhom={setForWhom}
        onSelectConcern={setConcern}
      />

      {allSelected && status === 'idle' && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={generate}
            style={{ background: ACCENT, border: 'none', cursor: 'pointer', color: '#fff' }}
            className="rounded-full px-8 py-3 text-base font-semibold shadow-lg transition-transform duration-200 hover:scale-105"
          >
            Generate my answer
          </button>
        </div>
      )}

      {status !== 'idle' && (
        <div
          className="mx-auto mt-8 max-w-xl rounded-[24px] px-6 py-8 text-center md:px-10"
          style={{ backgroundColor: 'rgba(255,255,255,0.86)', border: '1px solid var(--ss-border)', minHeight: 320 }}
        >
          {status === 'loading' && (
            <div className="text-base" style={{ color: MUTED }}>
              Writing something for {forWhom?.toLowerCase()}, about {concern?.toLowerCase()}, for {city}…
            </div>
          )}

          {status === 'done' && (
            <>
              <div className="text-xl leading-relaxed" style={{ fontFamily: SERIF, color: TEXT }}>
                {result.meaning}
              </div>

              {result.action && (
                <div
                  className="mx-auto mt-6 max-w-md rounded-2xl px-5 py-4 text-base"
                  style={{ backgroundColor: 'rgba(122,184,230,0.14)', border: '1px solid rgba(122,184,230,0.32)', color: TEXT, fontFamily: SERIF }}
                >
                  {result.action}
                </div>
              )}

              {result.comparisons && result.comparisons.length > 0 && (
                <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
                  {result.comparisons.map((c) => (
                    <div key={c.city} className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(23,50,74,0.04)' }}>
                      <div className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
                        {c.city}
                        {AGENTIC_CLOSING_CITY_COUNTRY[c.city] ? `, ${AGENTIC_CLOSING_CITY_COUNTRY[c.city]}` : ''}
                      </div>
                      <div className="mt-1 text-sm leading-snug" style={{ fontFamily: SERIF, color: TEXT }}>{c.line}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-col items-center">
                <div
                  className="agentic-closing-breathe"
                  style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: colorForCity(city!), opacity: 0.55 }}
                />
                <div className="mt-4 max-w-sm text-base leading-relaxed" style={{ fontFamily: SERIF, color: MUTED }}>
                  {result.phrase}
                </div>
              </div>

              <button
                type="button"
                onClick={reset}
                className="mt-8 text-sm font-semibold hover:underline"
                style={{ color: ACCENT, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Ask about someone else
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        .agentic-closing-breathe { animation: agentic-closing-breathe 4s ease-in-out infinite; }
        @keyframes agentic-closing-breathe {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.35); opacity: 0.65; }
        }
      `}</style>
    </div>
  );
};
