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

export const WhatThisMeansToday: React.FC<Props> = ({ city, forWhom, concern }) => {
  const { data, loading, error } = useAgenticText(
    true,
    () => storyAPI.agenticMeaning({ city, for_whom: forWhom, concern }),
    [city, forWhom, concern]
  );

  return (
    <div className="text-center">
      <div
        className="text-xl leading-loose transition-opacity duration-700"
        style={{ fontFamily: SERIF, color: TEXT, opacity: loading ? 0 : 1 }}
      >
        {error ? <span style={{ color: LABEL }}>{error}</span> : data?.meaning}
      </div>
    </div>
  );
};
