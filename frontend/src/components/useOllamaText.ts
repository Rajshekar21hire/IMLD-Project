import { useEffect, useRef, useState } from 'react';
import { storyAPI } from '../services/api';

export type OllamaTextStatus = 'idle' | 'loading' | 'done' | 'error';

// Routes through the backend's /stories/ollama-text proxy instead of calling Ollama directly
// from the browser. A hardcoded 127.0.0.1:11434 in the browser only ever reaches Ollama on the
// developer's own machine - it breaks for anyone else running this via Docker or a remote
// deploy, and it bypasses the backend's shared concurrency throttle and Gemini fallback. The
// backend already retries internally, so no client-side retry loop is needed here.
export function useOllamaText(prompt: string | null, fallback: string, debounceMs = 400) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<OllamaTextStatus>('idle');
  const requestId = useRef(0);

  useEffect(() => {
    if (!prompt) {
      setStatus('idle');
      setText('');
      return;
    }

    const myId = ++requestId.current;
    setStatus('loading');

    const timer = setTimeout(() => {
      (async () => {
        try {
          const res = await storyAPI.ollamaText({ prompt });
          if (requestId.current !== myId) return;
          const responseText = res.data?.success ? String(res.data.data?.text || '').trim() : '';
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
  }, [prompt, fallback, debounceMs]);

  return { text, status };
}
