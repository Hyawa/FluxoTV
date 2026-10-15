import { useEffect, useState } from 'react';
import { fetchNowNext, type NowNext } from '@/lib/api';

export function useNowNext(ids: string[], enabled = true): Record<string, NowNext> {
  const [data, setData] = useState<Record<string, NowNext>>({});
  const key = ids.join('|');

  useEffect(() => {
    if (!enabled || !key) {
      setData({});
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await fetchNowNext(ids);
        if (!cancelled) setData(result);
      } catch {
        /* EPG é opcional */
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return data;
}
