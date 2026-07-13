import React from 'react';
import { storyAPI } from '../services/api';
import { AGENTIC_CITIES } from './WhoAreYouAskingFor';
import { useAgenticText } from './useAgenticText';

const MUTED = '#8b8780';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";

const PALETTE = ['#8fa77c', '#c9a86a', '#c17f5e'];
const colorForCity = (city: string) => PALETTE[AGENTIC_CITIES.indexOf(city) % PALETTE.length] || PALETTE[0];

type Props = {
  city: string;
  forWhom: string;
  concern: string;
};

export const BreathingCircle: React.FC<Props> = ({ city, forWhom, concern }) => {
  const { data, loading } = useAgenticText(
    true,
    () => storyAPI.agenticBreath({ city, for_whom: forWhom, concern }),
    [city, forWhom, concern]
  );

  const color = colorForCity(city);

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="ic-breathe"
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          backgroundColor: color,
          opacity: 0.55,
        }}
      />
      <div
        className="mt-6 max-w-lg text-xl leading-relaxed transition-opacity duration-700"
        style={{ fontFamily: SERIF, color: MUTED, opacity: loading ? 0 : 1 }}
      >
        {data?.phrase}
      </div>

      <style>{`
        .ic-breathe {
          animation: bc-breathe 4s ease-in-out infinite;
        }
        @keyframes bc-breathe {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.35); opacity: 0.65; }
        }
      `}</style>
    </div>
  );
};
