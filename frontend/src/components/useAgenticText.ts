import { useEffect, useState } from 'react';

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
    fetchFn()
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success) {
          setData(res.data.data);
        } else {
          setError('Could not reach the AI service right now.');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the AI service right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
