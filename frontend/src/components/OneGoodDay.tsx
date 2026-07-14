import React, { useState } from 'react';
import { storyAPI } from '../services/api';

const TEXT = '#232323';
const MUTED = '#8b8780';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";

const PHASE_ORDER = ['morning', 'midday', 'evening', 'night'];

type TimelineItem = { phase: string; text: string };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) await delay(attempt * 1000);
    }
  }
  throw lastError;
}

export const OneGoodDay: React.FC = () => {
  const [revealed, setRevealed] = useState(false);
  const [scene, setScene] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = async () => {
    setRevealed(true);
    setLoading(true);
    setError(null);
    try {
      const [sceneRes, timelineRes] = await Promise.all([
        withRetry(() => storyAPI.agenticGoodDay({})),
        withRetry(() => storyAPI.agenticGoodDayTimeline({})),
      ]);
      if (sceneRes.data?.success) {
        setScene(sceneRes.data.data.scene);
      } else {
        setError('Could not reach the AI service right now.');
      }
      if (timelineRes.data?.success) {
        const ordered = PHASE_ORDER.map(
          (phase) => timelineRes.data.data.timeline.find((item: TimelineItem) => item.phase === phase)
        ).filter(Boolean);
        setTimeline(ordered);
      }
    } catch {
      setError('Could not reach the AI service right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-[24px] text-center transition-all duration-[3000ms]"
      style={{
        background: revealed
          ? 'linear-gradient(135deg, #bfe3f0 0%, #dff3e8 55%, #fdf3d8 100%)'
          : 'linear-gradient(135deg, #ffe3d1 0%, #ffd7e8 55%, #e2d8ff 100%)',
        padding: '56px 24px',
      }}
    >
      {!revealed && (
        <button
          type="button"
          onClick={show}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
            border: 'none',
            cursor: 'pointer',
          }}
          className="rounded-full px-9 py-3.5 text-lg font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-105"
        >
          Show me a good day
        </button>
      )}

      {revealed && (
        <>
          <div
            className="mx-auto max-w-lg text-xl leading-relaxed transition-opacity duration-[2000ms]"
            style={{ fontFamily: SERIF, color: TEXT, opacity: loading ? 0 : 1 }}
          >
            {error ? <span style={{ color: MUTED }}>{error}</span> : scene}
          </div>

          {!error && timeline.length === 4 && (
            <div className="mx-auto mt-10 max-w-lg">
              <div className="relative h-1 w-full rounded-full" style={{ backgroundColor: 'rgba(58,55,51,0.15)' }}>
                <div className="absolute inset-0 flex items-center justify-between">
                  {timeline.map((item, index) => (
                    <div
                      key={item.phase}
                      className="h-3 w-3 rounded-full transition-opacity"
                      style={{
                        backgroundColor: '#c026d3',
                        opacity: loading ? 0 : 1,
                        transitionDuration: '600ms',
                        transitionDelay: `${index * 500}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-sm" style={{ color: MUTED }}>
                {timeline.map((item, index) => (
                  <div
                    key={item.phase}
                    className="transition-opacity"
                    style={{ opacity: loading ? 0 : 1, transitionDuration: '600ms', transitionDelay: `${index * 500}ms` }}
                  >
                    <div className="font-semibold capitalize" style={{ color: TEXT }}>{item.phase}</div>
                    <div className="mt-1">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
