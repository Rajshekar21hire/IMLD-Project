import React, { useState } from 'react';

// Matches AGENTIC_CITIES in backend/app/routes/story_routes.py exactly - the backend silently
// coerces any unrecognised city to Delhi, so this list must never diverge from the backend's.
// Only the Diurnal Ribbon (in the opening beat) uses this list now - the closing beat below uses
// AGENTIC_CLOSING_CITIES instead, so the section doesn't repeat the same five cities twice.
// Two cities per real-world AQI tier (worst/medium/best - the same tiers as AGENTIC_TIERED_CITIES
// in agenticMechanismData.ts) so the Diurnal Ribbon shows the daily pattern across the full range
// of air quality instead of five cities that are all in the same "bad" bracket.
export const AGENTIC_CITIES_PRIMARY = ['Delhi', 'Lahore', 'Beijing', 'Mexico City', 'Zurich', 'Wellington'];

export const AGENTIC_CITIES_PRIMARY_TIER: Record<string, 'worst' | 'medium' | 'best'> = {
  Delhi: 'worst',
  Lahore: 'worst',
  Beijing: 'medium',
  'Mexico City': 'medium',
  Zurich: 'best',
  Wellington: 'best',
};

// Matches AGENTIC_CLOSING_CITIES in backend/app/routes/story_routes.py exactly. Deliberately a
// fresh set of cities - not discussed anywhere else in this section - spanning worse, medium,
// and cleaner air so "where do you live" doesn't imply everyone lives somewhere hazardous.
export const AGENTIC_CLOSING_CITIES = ['Ulaanbaatar', "N'Djamena", 'Peshawar', 'Cairo', 'Jakarta', 'Vancouver', 'Helsinki'];

// Shown under each city button - these are deliberately less-familiar cities, so naming the
// country avoids anyone guessing blind.
export const AGENTIC_CLOSING_CITY_COUNTRY: Record<string, string> = {
  Ulaanbaatar: 'Mongolia',
  "N'Djamena": 'Chad',
  Peshawar: 'Pakistan',
  Cairo: 'Egypt',
  Jakarta: 'Indonesia',
  Vancouver: 'Canada',
  Helsinki: 'Finland',
};

// Matches AGENTIC_CLOSING_CITY_DATA in backend/app/routes/story_routes.py exactly - used only to
// keep the client-side fallback (network failure, backend unreachable) honest about whether each
// city's air is actually good or bad, instead of a one-size-fits-all fallback sentence.
export const AGENTIC_CLOSING_CITY_DATA: Record<string, { aqi: number; pollutant: string; trend: string }> = {
  Ulaanbaatar: { aqi: 168, pollutant: 'PM2.5', trend: 'rising' },
  "N'Djamena": { aqi: 152, pollutant: 'dust (PM10)', trend: 'steady' },
  Peshawar: { aqi: 174, pollutant: 'PM2.5', trend: 'rising' },
  Cairo: { aqi: 141, pollutant: 'PM10', trend: 'steady' },
  Jakarta: { aqi: 88, pollutant: 'PM2.5', trend: 'falling' },
  Vancouver: { aqi: 32, pollutant: 'PM2.5', trend: 'steady' },
  Helsinki: { aqi: 18, pollutant: 'PM2.5', trend: 'falling' },
};

export const AGENTIC_FOR_WHOM = ['Myself', 'My child', 'My parents', 'Someone with asthma'];
export const AGENTIC_CONCERNS = ['Going outside today', 'Sleeping better', 'Cooking at home', 'The long run'];

// Matches AGENTIC_TONES in backend/app/routes/story_routes.py exactly.
export const AGENTIC_TONES = ['Reassuring', 'Urgent', 'Playful', 'Clinical', 'Friendly'];

const TEXT = 'var(--ss-text)';
const ACCENT = '#0284c7';

type Props = {
  city: string | null;
  forWhom: string | null;
  concern: string | null;
  tone: string | null;
  onSelectCity: (v: string) => void;
  onSelectForWhom: (v: string) => void;
  onSelectConcern: (v: string) => void;
  onSelectTone: (v: string) => void;
};

const OptionButton: React.FC<{ opt: string; active: boolean; onSelect: (v: string) => void; caption?: string }> = ({
  opt,
  active,
  onSelect,
  caption,
}) => (
  <button
    type="button"
    onClick={() => onSelect(opt)}
    style={{
      color: active ? '#fff' : TEXT,
      background: active ? ACCENT : '#fff',
      border: `1.5px solid ${active ? ACCENT : 'var(--ss-border)'}`,
      borderRadius: '999px',
      padding: caption ? '6px 18px 8px' : '8px 18px',
      cursor: 'pointer',
      fontWeight: active ? 700 : 500,
      boxShadow: active ? '0 4px 14px rgba(14,165,233,0.28)' : '0 1px 2px rgba(0,0,0,0.03)',
      textAlign: 'center',
    }}
    className="text-base transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300"
  >
    {opt}
    {caption && (
      <span
        className="block text-[11px] font-normal leading-tight"
        style={{ color: active ? 'rgba(255,255,255,0.85)' : 'var(--ss-muted)' }}
      >
        {caption}
      </span>
    )}
  </button>
);

const Row: React.FC<{
  question: string;
  options: string[];
  moreOptions?: string[];
  moreLabel?: string;
  value: string | null;
  onSelect: (v: string) => void;
  captions?: Record<string, string>;
}> = ({ question, options, moreOptions, moreLabel, value, onSelect, captions }) => {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="mt-10 first:mt-0">
      <div className="text-lg font-semibold" style={{ color: TEXT }}>
        {question}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {options.map((opt) => (
          <OptionButton key={opt} opt={opt} active={value === opt} onSelect={onSelect} caption={captions?.[opt]} />
        ))}
        {showMore && moreOptions?.map((opt) => (
          <OptionButton key={opt} opt={opt} active={value === opt} onSelect={onSelect} caption={captions?.[opt]} />
        ))}
        {moreOptions && !showMore && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            style={{ color: ACCENT, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            className="text-lg font-semibold hover:underline"
          >
            + {moreLabel || 'More'}
          </button>
        )}
      </div>
    </div>
  );
};

export const WhoAreYouAskingFor: React.FC<Props> = ({
  city,
  forWhom,
  concern,
  tone,
  onSelectCity,
  onSelectForWhom,
  onSelectConcern,
  onSelectTone,
}) => {
  return (
    <div>
      <Row
        question="Where do you live?"
        options={AGENTIC_CLOSING_CITIES}
        value={city}
        onSelect={onSelectCity}
        captions={AGENTIC_CLOSING_CITY_COUNTRY}
      />
      <Row question="Who are you asking for?" options={AGENTIC_FOR_WHOM} value={forWhom} onSelect={onSelectForWhom} />
      <Row question="What's on your mind?" options={AGENTIC_CONCERNS} value={concern} onSelect={onSelectConcern} />
      <Row question="How should it sound?" options={AGENTIC_TONES} value={tone} onSelect={onSelectTone} />
    </div>
  );
};
