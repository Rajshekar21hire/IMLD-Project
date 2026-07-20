import React from 'react';

const SERIF = 'inherit';
const MUTED = '#8b8780';

type Props = {
  text: string;
  loading?: boolean;
  generated?: boolean;
};

// Shared caption slot for the new Agentic AI visualizations - accepts the LLM-written
// (or fallback) caption text as a prop so each chart stays a pure presentation component.
export const AgenticCaption: React.FC<Props> = ({ text, loading, generated }) => (
  <div className="mx-auto mt-4 max-w-[84rem] text-center transition-opacity duration-500" style={{ opacity: loading ? 0.5 : 1 }}>
    <br />
    <p className="leading-relaxed text-slate-700" style={{ fontFamily: 'inherit', fontSize: '1.125rem', lineHeight: 1.8 }}>
      {text}
    </p>
    {generated && (
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#b8b2a6' }}>
        Ollama generated
      </p>
    )}
  </div>
);
