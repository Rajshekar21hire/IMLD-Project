import { useEffect, useRef, useState } from 'react';
import { storyAPI } from '../services/api';

export type AgenticCaptionStatus = 'idle' | 'loading' | 'done' | 'error';

// Routes through the backend's /stories/agentic-caption proxy (fixed system prompt lives
// server-side) instead of calling Ollama directly from the browser at a hardcoded
// 127.0.0.1:11434 - that only worked on the developer's own machine and skipped the backend's
// shared concurrency throttle, retries, caching, and Gemini fallback.
//
// userMessage should describe the chart type and pass the relevant data slice, e.g.
// `Chart type: seasonality heatmap. Data: {"Delhi": [...]}`.
export function useAgenticOllamaCaption(userMessage: string | null, fallback: string, debounceMs = 300) {
  const [text, setText] = useState(fallback);
  const [status, setStatus] = useState<AgenticCaptionStatus>('idle');
  const requestId = useRef(0);

  useEffect(() => {
    if (!userMessage) {
      setStatus('idle');
      return;
    }

    const myId = ++requestId.current;
    setStatus('loading');

    const timer = setTimeout(() => {
      (async () => {
        try {
          const res = await storyAPI.agenticCaption({ message: userMessage });
          if (requestId.current !== myId) return;
          const responseText = res.data?.success
            ? String(res.data.data?.text || '').trim().replace(/^"|"$/g, '')
            : '';
          if (!responseText) throw new Error('empty response');
          setText(responseText);
          setStatus('done');
        } catch {
          if (requestId.current !== myId) return;
          setText(fallback);
          setStatus('error');
        }
      })();
    }, debounceMs);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMessage]);

  return { text, status };
}
