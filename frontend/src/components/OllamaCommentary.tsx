import React from 'react';
import { OllamaTextStatus } from './useOllamaText';

type Props = {
  status: OllamaTextStatus;
  text: string;
};

export const OllamaCommentaryBody: React.FC<Props> = ({ status, text }) => {
  if (status === 'loading') {
    return (
      <div className="animate-pulse space-y-2" aria-label="Generating commentary">
        <div className="h-3 w-11/12 rounded-full bg-slate-200" />
        <div className="h-3 w-4/5 rounded-full bg-slate-200" />
        <div className="h-3 w-2/3 rounded-full bg-slate-200" />
      </div>
    );
  }
  return <p className="text-base leading-relaxed text-slate-700">{text}</p>;
};
