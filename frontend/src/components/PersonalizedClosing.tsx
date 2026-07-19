import React, { useEffect, useRef, useState } from 'react';
import { storyAPI } from '../services/api';
import { WhoAreYouAskingFor, AGENTIC_CLOSING_CITIES, AGENTIC_CLOSING_CITY_DATA } from './WhoAreYouAskingFor';

const TEXT = 'var(--ss-text)';
const MUTED = 'var(--ss-muted)';
const SERIF = 'inherit';

const CITY_PALETTE = ['#8fa77c', '#c9a86a', '#c17f5e', '#5b9aa8', '#a78bfa', '#e08a86', '#7bc9b8'];
const colorForCity = (city: string) => CITY_PALETTE[AGENTIC_CLOSING_CITIES.indexOf(city) % CITY_PALETTE.length] || CITY_PALETTE[0];

type Mood = 'happy' | 'sad';
type Result = { text?: string; mood?: Mood };

// A stable (non-cryptographic) string hash so the same city/for-whom/concern/tone combination
// always lands on the same fallback phrasing, while different combinations don't all read
// identically - this only matters when a request genuinely fails (network error, Ollama
// unreachable), since a successful response already carries text written for that combination.
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(seed: string, variants: T[]): T {
  return variants[hashString(seed) % variants.length];
}

// Audiences for whom the risk threshold should be tighter, regardless of tone - mirrors
// _AGENTIC_VULNERABLE_FOR_WHOM in story_routes.py.
const VULNERABLE_FOR_WHOM = new Set(['My child', 'My parents', 'Someone with asthma']);

function moodFor(aqi: number, forWhom: string): Mood {
  const threshold = VULNERABLE_FOR_WHOM.has(forWhom) ? 100 : 150;
  return aqi >= threshold ? 'sad' : 'happy';
}

// Mirrors the backend's own severity-tiered fallback phrasing (see _agentic_briefing_fallback in
// story_routes.py) so a client-side failure - the request never even reaching the backend - still
// tells the truth about whether the air is actually good or bad, instead of one vague sentence
// that reads the same regardless of the real AQI reading.
function fallbackTier(aqi: number, forWhom: string): 'clean' | 'caution' | 'high-risk' {
  const vulnerable = VULNERABLE_FOR_WHOM.has(forWhom);
  if (aqi > 150) return 'high-risk';
  if (aqi > 100 || (aqi > 50 && vulnerable)) return 'caution';
  return 'clean';
}

const TONE_OPENERS: Record<string, string> = {
  Reassuring: "Here's the honest picture, gently put:",
  Urgent: 'Worth paying attention to today:',
  Playful: 'Quick air check, no drama:',
  Clinical: 'Current reading:',
  Friendly: "Hey, here's today's air:",
};

const TEXT_FALLBACK: Record<'clean' | 'caution' | 'high-risk', string[]> = {
  clean: [
    "{opener} {city}'s air is reading {aqi} on the AQI scale, {pollutant} included, and that's " +
      "genuinely good news for {forWhom}. There's no real reason to change plans around {concern} " +
      'today - it stays {trend}, so this is a fine window to just enjoy it.',
    '{opener} at {aqi} AQI, {city}\'s air is clean today, mostly {pollutant} at low levels. For ' +
      '{forWhom} and {concern}, there\'s nothing to work around right now - go ahead as normal.',
  ],
  caution: [
    "{opener} {city}'s air is reading {aqi} on the AQI scale, driven mainly by {pollutant} - " +
      'something like spending the day near a busy road. For {forWhom}, with {concern} in mind, ' +
      'the better window is early morning, before it builds up further.',
    'Right now {city} sits at an AQI of {aqi}, mostly {pollutant}, and holding {trend}. {opener} ' +
      'for {forWhom} and {concern}, the simplest change is to keep windows closed through the ' +
      'middle of the day and let fresh air in during the calmer early hours instead.',
  ],
  'high-risk': [
    "{opener} {city}'s air is reading {aqi} on the AQI scale today - high enough that it matters " +
      'for {forWhom}, especially with {concern} in mind. The safer move is to cut back time ' +
      'outdoors and lean on indoor air where you can until {pollutant} levels ease.',
    '{opener} at {aqi} AQI and holding {trend}, {city}\'s air is unhealthy right now, mostly ' +
      '{pollutant}. For {forWhom}, with {concern} in mind, treat today as one to scale back ' +
      'outdoor time - the precaution genuinely matters at this level.',
  ],
};

const fallbackText = (city: string, forWhom: string, concern: string, tone: string) => {
  const cityData = AGENTIC_CLOSING_CITY_DATA[city];
  const tier = fallbackTier(cityData.aqi, forWhom);
  const template = pick(`${city}|${forWhom}|${concern}|${tone}`, TEXT_FALLBACK[tier]);
  return template
    .replace(/{opener}/g, TONE_OPENERS[tone] || "Here's today's air:")
    .replace(/{city}/g, city)
    .replace(/{aqi}/g, String(cityData.aqi))
    .replace(/{pollutant}/g, cityData.pollutant)
    .replace(/{trend}/g, cityData.trend)
    .replace(/{forWhom}/g, forWhom.toLowerCase())
    .replace(/{concern}/g, concern.toLowerCase());
};

export const PersonalizedClosing: React.FC = () => {
  const [city, setCity] = useState<string | null>(null);
  const [forWhom, setForWhom] = useState<string | null>(null);
  const [concern, setConcern] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [result, setResult] = useState<Result>({});
  const requestIdRef = useRef(0);

  // Regenerates automatically whenever any of the four picks changes, once all four are set - no
  // separate "Generate" click needed, and no manual "start over" needed either since picking a
  // different city/for-whom/concern/tone here just re-fires this effect in place.
  useEffect(() => {
    if (!city || !forWhom || !concern || !tone) return;

    const myRequestId = ++requestIdRef.current;
    setStatus('loading');
    setResult({});

    (async () => {
      try {
        const res = await storyAPI.agenticBriefing({ city, for_whom: forWhom, concern, tone });
        if (requestIdRef.current !== myRequestId) return;
        if (res?.data?.success) {
          setResult({ text: String(res.data.data.text), mood: res.data.data.mood === 'sad' ? 'sad' : 'happy' });
        } else {
          setResult({ text: fallbackText(city, forWhom, concern, tone), mood: moodFor(AGENTIC_CLOSING_CITY_DATA[city].aqi, forWhom) });
        }
      } catch {
        if (requestIdRef.current !== myRequestId) return;
        setResult({ text: fallbackText(city, forWhom, concern, tone), mood: moodFor(AGENTIC_CLOSING_CITY_DATA[city].aqi, forWhom) });
      } finally {
        if (requestIdRef.current === myRequestId) setStatus('done');
      }
    })();
  }, [city, forWhom, concern, tone]);

  return (
    <div>
      <WhoAreYouAskingFor
        city={city}
        forWhom={forWhom}
        concern={concern}
        tone={tone}
        onSelectCity={setCity}
        onSelectForWhom={setForWhom}
        onSelectConcern={setConcern}
        onSelectTone={setTone}
      />

      {status !== 'idle' && (
        <div
          className="mx-auto mt-8 max-w-[72rem] rounded-[24px] px-6 py-8 text-center md:px-10"
          style={{ backgroundColor: 'rgba(255,255,255,0.86)', border: '1px solid var(--ss-border)', minHeight: 320 }}
        >
          {!result.text && (
            <div className="text-base" style={{ color: MUTED }}>
              Writing something for {forWhom?.toLowerCase()}, about {concern?.toLowerCase()}, for {city}…
            </div>
          )}

          {result.text && (
            <>
              <div className="text-xl leading-relaxed" style={{ fontFamily: SERIF, color: TEXT }}>
                <span className="mr-2" aria-hidden="true">{result.mood === 'sad' ? '😔' : '🙂'}</span>
                {result.text}
              </div>

              <div className="mt-8 flex flex-col items-center">
                <div
                  className="agentic-closing-breathe"
                  style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: colorForCity(city!), opacity: 0.55 }}
                />
              </div>
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
