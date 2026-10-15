import { PLAYLIST_TTL_MS, PLAYLIST_URL, UPSTREAM_USER_AGENT } from './config';

export interface Channel {
  id: string;
  name: string;
  logo: string | null;
  groups: string[];
  url: string;
  tvgId: string | null;
}

interface CacheEntry {
  channels: Channel[];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<Channel[]> | null = null;

function findName(info: string): string {
  let inQuotes = false;
  for (let i = 0; i < info.length; i++) {
    const c = info[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      return info.slice(i + 1).trim();
    }
  }
  return '';
}

function parseAttrs(info: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z0-9-]+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(info)) !== null) {
    attrs[m[1].toLowerCase()] = m[2];
  }
  return attrs;
}

export function parseM3U(text: string): Channel[] {
  const lines = text.split(/\r?\n/);
  const channels: Channel[] = [];
  let pendingInfo: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      pendingInfo = line.slice('#EXTINF'.length);
      continue;
    }
    if (line.startsWith('#')) continue;

    if (pendingInfo !== null) {
      const attrs = parseAttrs(pendingInfo);
      const name = findName(pendingInfo) || 'Sem nome';
      const tvgId = attrs['tvg-id'] || null;
      const logo = attrs['tvg-logo'] || null;
      const groups = (attrs['group-title'] || 'Undefined')
        .split(';')
        .map((g) => g.trim())
        .filter(Boolean);

      channels.push({
        id: tvgId ?? line,
        name,
        logo,
        groups: groups.length ? groups : ['Undefined'],
        url: line,
        tvgId,
      });
      pendingInfo = null;
    }
  }

  return channels;
}

async function downloadPlaylist(): Promise<Channel[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(PLAYLIST_URL, {
      headers: { 'User-Agent': UPSTREAM_USER_AGENT, Accept: '*/*' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Falha ao baixar playlist: HTTP ${res.status}`);
    }
    const text = await res.text();
    const channels = parseM3U(text);
    if (channels.length === 0) {
      throw new Error('Playlist vazia ou em formato inesperado');
    }
    return channels;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getChannels(force = false): Promise<Channel[]> {
  const now = Date.now();
  if (!force && cache && now - cache.fetchedAt < PLAYLIST_TTL_MS) {
    return cache.channels;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const channels = await downloadPlaylist();
      cache = { channels, fetchedAt: Date.now() };
      return channels;
    } catch (err) {
      if (cache) {
        console.warn('[playlist] download falhou, usando cache antigo:', (err as Error).message);
        return cache.channels;
      }
      throw err;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
