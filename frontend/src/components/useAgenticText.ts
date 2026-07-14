import { useEffect, useState } from 'react';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useAgenticText(
  enabled: boolean,
  fetchFn: () => Promise<any>,
  deps: any[]
) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const attempts = 3;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        if (cancelled) return;
        try {
          const res = await fetchFn();
          if (cancelled) return;
          if (res.data?.success) {
            setData(res.data.data);
            setLoading(false);
            return;
          }
          throw new Error('backend reported failure');
        } catch {
          if (cancelled) return;
          if (attempt < attempts) {
            await delay(attempt * 1000);
            continue;
          }
          setError('Could not reach the AI service right now.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
