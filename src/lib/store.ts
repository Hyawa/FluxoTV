export interface PersistState {
  numbers: Record<string, number>;
  lastId: string | null;
  volume: number;
}

const KEY = 'iptv.tvbox.v1';

const DEFAULT_STATE: PersistState = { numbers: {}, lastId: null, volume: 1 };

export function loadState(): PersistState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<PersistState>;
    return {
      numbers: parsed.numbers ?? {},
      lastId: parsed.lastId ?? null,
      volume: typeof parsed.volume === 'number' ? parsed.volume : 1,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: PersistState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
