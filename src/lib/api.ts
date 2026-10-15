export interface Channel {
  id: string;
  name: string;
  logo: string | null;
  groups: string[];
  url: string;
  tvgId: string | null;
}

export interface Playlist {
  count: number;
  groups: string[];
  channels: Channel[];
}

export interface Programme {
  start: number;
  stop: number;
  title: string;
  desc?: string;
}

export interface NowNext {
  current: Programme | null;
  next: Programme | null;
}

export const CORE_URL =
  (import.meta.env.VITE_CORE_URL as string | undefined) ?? 'http://127.0.0.1:8787';

export function streamUrl(url: string): string {
  return `${CORE_URL}/stream?u=${encodeURIComponent(url)}`;
}

export function logoUrl(url: string): string {
  return `${CORE_URL}/api/logo?u=${encodeURIComponent(url)}`;
}

export async function fetchPlaylist(): Promise<Playlist> {
  const res = await fetch(`${CORE_URL}/api/playlist`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Falha ao carregar canais (HTTP ${res.status})`);
  return (await res.json()) as Playlist;
}

export async function waitForCore(timeoutMs = 25_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${CORE_URL}/api/health`, { cache: 'no-store' });
      if (res.ok) return;
    } catch {
      /* servidor ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Servidor local nao respondeu. Verifique o backend.');
}

export async function fetchNowNext(ids: string[]): Promise<Record<string, NowNext>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const res = await fetch(`${CORE_URL}/api/epg/now?ids=${encodeURIComponent(unique.join(','))}`, {
    cache: 'no-store',
  });
  if (!res.ok) return {};
  const data = (await res.json()) as { results: Record<string, NowNext> };
  return data.results ?? {};
}

export interface EpgStatus {
  configured: boolean;
  url: string;
  channels: number;
  loading: boolean;
  error: string | null;
  updatedAt: string | null;
}

export async function fetchEpgStatus(): Promise<EpgStatus> {
  const res = await fetch(`${CORE_URL}/api/epg/status`, { cache: 'no-store' });
  return (await res.json()) as EpgStatus;
}

export interface Settings {
  epgUrl: string;
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(`${CORE_URL}/api/settings`, { cache: 'no-store' });
  return (await res.json()) as Settings;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const res = await fetch(`${CORE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return (await res.json()) as Settings;
}
