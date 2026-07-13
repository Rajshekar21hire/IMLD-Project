import React from 'react';
import { storyAPI } from '../services/api';
import { useAgenticText } from './useAgenticText';

const TEXT = '#3a3733';
const LABEL = '#8b8780';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";

type Props = {
  city: string;
  forWhom: string;
  concern: string;
};

export const NeighbourComparison: React.FC<Props> = ({ city, forWhom, concern }) => {
  const { data, loading, error } = useAgenticText(
    true,
    () => storyAPI.agenticNeighbours({ city, for_whom: forWhom, concern }),
    [city, forWhom, concern]
  );

  const comparisons: { city: string; line: string }[] = data?.comparisons || [];

  return (
    <div className="text-center">
      <div
        className="mx-auto flex max-w-xl flex-col gap-6 transition-opacity duration-700"
        style={{ opacity: loading ? 0 : 1 }}
      >
        {error && <span style={{ color: LABEL }}>{error}</span>}
        {!error &&
          comparisons.map((item) => (
            <div key={item.city}>
              <div className="text-sm font-semibold uppercase tracking-[0.15em]" style={{ color: LABEL }}>{item.city}</div>
              <div className="mt-1 text-xl leading-relaxed" style={{ fontFamily: SERIF, color: TEXT }}>
                {item.line}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
