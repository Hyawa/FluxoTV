import { gunzipSync } from 'node:zlib';
import { EPG_MAX_BYTES, EPG_TIMEOUT_MS, EPG_TTL_MS, UPSTREAM_USER_AGENT } from './config';
import { getSettings } from './settings';

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

const WINDOW_PAST_MS = 60 * 60 * 1000;
const WINDOW_FUTURE_MS = 48 * 60 * 60 * 1000;

let index = new Map<string, Programme[]>();
let updatedAt = 0;
let loading = false;
let lastError = '';
let loadedUrl = '';

export function normalizeId(id: string): string {
  return id
    .toLowerCase()
    .split('@')[0]
    .replace(/[^a-z0-9]/g, '');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
}

function tagText(body: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(body);
  return m ? m[1].trim() : '';
}

export function parseXmltvDate(value: string): number {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T)?(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/);
  if (!m) return NaN;
  const [, y, mo, d, h, mi, se, tz] = m;
  const base = `${y}-${mo}-${d}T${h}:${mi}:${se ?? '00'}`;
  if (tz) return Date.parse(`${base}${tz.slice(0, 3)}:${tz.slice(3)}`);
  return Date.parse(`${base}Z`);
}

export function parseXmltv(text: string, now = Date.now()): Map<string, Programme[]> {
  const map = new Map<string, Programme[]>();
  const re = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const channel = attr(m[1], 'channel');
    if (!channel) continue;

    const start = parseXmltvDate(attr(m[1], 'start') ?? '');
    if (!Number.isFinite(start)) continue;

    const stopRaw = parseXmltvDate(attr(m[1], 'stop') ?? '');
    const stop = Number.isFinite(stopRaw) ? stopRaw : start;

    if (stop < now - WINDOW_PAST_MS || start > now + WINDOW_FUTURE_MS) continue;

    const title = decodeEntities(tagText(m[2], 'title')) || 'Sem titulo';
    const desc = decodeEntities(tagText(m[2], 'desc'));

    const key = normalizeId(channel);
    const list = map.get(key) ?? [];
    list.push({ start, stop, title, desc: desc || undefined });
    map.set(key, list);
  }

  for (const list of map.values()) list.sort((a, b) => a.start - b.start);
  return map;
}

async function downloadEpg(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EPG_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UPSTREAM_USER_AGENT, Accept: '*/*' },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const len = Number(res.headers.get('content-length') ?? 0);
    if (len && len > EPG_MAX_BYTES) throw new Error('EPG muito grande');

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > EPG_MAX_BYTES) throw new Error('EPG muito grande');

    const isGzip = url.endsWith('.gz') || (buffer[0] === 0x1f && buffer[1] === 0x8b);
    const text = isGzip ? gunzipSync(buffer).toString('utf8') : buffer.toString('utf8');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshEpg(force = false): Promise<void> {
  const { epgUrl } = await getSettings();
  if (!epgUrl) {
    index = new Map();
    updatedAt = 0;
    lastError = '';
    loadedUrl = '';
    return;
  }
  if (loading) return;
  if (!force && loadedUrl === epgUrl && Date.now() - updatedAt < EPG_TTL_MS) return;

  loading = true;
  lastError = '';
  try {
    const text = await downloadEpg(epgUrl);
    index = parseXmltv(text);
    updatedAt = Date.now();
    loadedUrl = epgUrl;
    console.log(`[epg] carregado: ${index.size} canais`);
  } catch (err) {
    lastError = (err as Error).message;
    console.warn('[epg] falha ao carregar:', lastError);
  } finally {
    loading = false;
  }
}

export function ensureEpg(): void {
  void refreshEpg(false);
}

export function epgStatus() {
  return {
    configured: Boolean(loadedUrl),
    url: loadedUrl,
    channels: index.size,
    loading,
    error: lastError || null,
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
  };
}

export function getNowNext(ids: string[]): Record<string, NowNext> {
  const now = Date.now();
  const result: Record<string, NowNext> = {};

  for (const id of ids) {
    const list = index.get(normalizeId(id));
    if (!list || list.length === 0) {
      result[id] = { current: null, next: null };
      continue;
    }

    let current: Programme | null = null;
    let next: Programme | null = null;
    for (const p of list) {
      if (p.start <= now && now < p.stop) {
        current = p;
      } else if (p.start > now && !next) {
        next = p;
        break;
      }
    }
    result[id] = { current, next };
  }

  return result;
}
