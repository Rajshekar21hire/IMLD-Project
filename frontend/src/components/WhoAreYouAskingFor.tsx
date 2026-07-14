import React, { useState } from 'react';

export const AGENTIC_CITIES_PRIMARY = ['Delhi', 'Lahore', 'Dhaka', 'Kathmandu', 'Kolkata'];
export const AGENTIC_CITIES_MORE = ['Karachi', 'Kanpur', 'Faisalabad', 'Chittagong', 'Lucknow'];
export const AGENTIC_CITIES = [...AGENTIC_CITIES_PRIMARY, ...AGENTIC_CITIES_MORE];
export const AGENTIC_FOR_WHOM = ['Myself', 'My child', 'My parents', 'Someone with asthma'];
export const AGENTIC_CONCERNS = ['Going outside today', 'Sleeping better', 'Cooking at home', 'The long run'];

const TEXT = '#232323';
const MUTED = '#8b8780';
const ACCENT = '#0ea5e9';

type Props = {
  city: string | null;
  forWhom: string | null;
  concern: string | null;
  onSelectCity: (v: string) => void;
  onSelectForWhom: (v: string) => void;
  onSelectConcern: (v: string) => void;
};

const OptionButton: React.FC<{ opt: string; active: boolean; onSelect: (v: string) => void }> = ({
  opt,
  active,
  onSelect,
}) => (
  <button
    type="button"
    onClick={() => onSelect(opt)}
    style={{
      color: active ? '#fff' : TEXT,
      background: active ? ACCENT : '#fff',
      border: `1.5px solid ${active ? ACCENT : '#e2ddd2'}`,
      borderRadius: '999px',
      padding: '8px 18px',
      cursor: 'pointer',
      fontWeight: active ? 700 : 500,
      boxShadow: active ? '0 4px 14px rgba(14,165,233,0.28)' : '0 1px 2px rgba(0,0,0,0.03)',
    }}
    className="text-base transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300"
  >
    {opt}
  </button>
);

const Row: React.FC<{
  question: string;
  options: string[];
  moreOptions?: string[];
  moreLabel?: string;
  value: string | null;
  onSelect: (v: string) => void;
}> = ({ question, options, moreOptions, moreLabel, value, onSelect }) => {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="mt-10 first:mt-0">
      <div className="text-lg font-semibold" style={{ color: TEXT }}>
        {question}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {options.map((opt) => (
          <OptionButton key={opt} opt={opt} active={value === opt} onSelect={onSelect} />
        ))}
        {showMore && moreOptions?.map((opt) => (
          <OptionButton key={opt} opt={opt} active={value === opt} onSelect={onSelect} />
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
  onSelectCity,
  onSelectForWhom,
  onSelectConcern,
}) => {
  return (
    <div>
      <Row
        question="Where do you live?"
        options={AGENTIC_CITIES_PRIMARY}
        moreOptions={AGENTIC_CITIES_MORE}
        moreLabel="More cities"
        value={city}
        onSelect={onSelectCity}
      />
      <Row question="Who are you asking for?" options={AGENTIC_FOR_WHOM} value={forWhom} onSelect={onSelectForWhom} />
      <Row question="What's on your mind?" options={AGENTIC_CONCERNS} value={concern} onSelect={onSelectConcern} />
    </div>
  );
};
