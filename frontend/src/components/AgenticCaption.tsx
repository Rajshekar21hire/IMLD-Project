import React from 'react';

const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";
const MUTED = '#8b8780';

type Props = {
  text: string;
  loading?: boolean;
  generated?: boolean;
};

// Shared caption slot for the new Agentic AI visualizations - accepts the LLM-written
// (or fallback) caption text as a prop so each chart stays a pure presentation component.
export const AgenticCaption: React.FC<Props> = ({ text, loading, generated }) => (
  <div className="mx-auto mt-4 max-w-2xl text-center transition-opacity duration-500" style={{ opacity: loading ? 0.5 : 1 }}>
    <p className="text-base leading-relaxed" style={{ fontFamily: SERIF, color: MUTED }}>
      {text}
    </p>
    {generated && (
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#b8b2a6' }}>
        Ollama generated
      </p>
    )}
  </div>
);
