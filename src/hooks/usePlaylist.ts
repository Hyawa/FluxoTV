import { useCallback, useEffect, useState } from 'react';
import { fetchPlaylist, waitForCore, type Channel } from '@/lib/api';

interface PlaylistState {
  channels: Channel[];
  groups: string[];
  loading: boolean;
  error: string | null;
}

export function usePlaylist() {
  const [state, setState] = useState<PlaylistState>({
    channels: [],
    groups: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await waitForCore();
      const data = await fetchPlaylist();
      setState({ channels: data.channels, groups: data.groups, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
