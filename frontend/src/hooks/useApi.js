import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fetch data on mount (and whenever `deps` change). `reload()` refetches
 * without clearing the current data, so refreshes never flash a spinner.
 */
export function useApi(fetcher, deps = [], { interval } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    reload();
    if (!interval) return undefined;
    const id = setInterval(reload, interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}
