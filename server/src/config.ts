import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const HOST = '127.0.0.1';
export const PORT = 8787;

export const PLAYLIST_URL =
  process.env.IPTV_PLAYLIST_URL ?? 'https://iptv-org.github.io/iptv/languages/por.m3u';

export const PLAYLIST_TTL_MS = 10 * 60 * 1000;
export const UPSTREAM_TIMEOUT_MS = 15_000;

export const PROXY_BASE = `http://${HOST}:${PORT}`;

export const UPSTREAM_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/**
 * EPG (Electronic Program Guide) is optional. There is no reliable public EPG
 * with IDs matching this playlist, so the user configures one at runtime
 * (see /api/settings). This is the default it starts with (empty = disabled).
 */
export const EPG_DEFAULT_URL = process.env.IPTV_EPG_URL ?? '';

export const EPG_TTL_MS = 6 * 60 * 60 * 1000;
export const EPG_MAX_BYTES = 60 * 1024 * 1024;
export const EPG_TIMEOUT_MS = 60_000;

export const DATA_DIR = join(tmpdir(), 'iptv-core');
export const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
