import { useEffect, useRef, useState } from 'react';

// Same endpoint/model/`stream: false` pattern already used inline in InterventionLedger.tsx,
// extracted here so both new AI-mode visualizations share one implementation.
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'llama3.2:3b';

export type OllamaTextStatus = 'idle' | 'loading' | 'done' | 'error';

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
          const res = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
          });
          if (!res.ok) throw new Error('bad response');
          const data = await res.json();
          const responseText = (data?.response || '').trim();
          if (!responseText) throw new Error('empty response');
          if (requestId.current !== myId) return;
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
