import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { PROXY_BASE, UPSTREAM_TIMEOUT_MS, UPSTREAM_USER_AGENT } from './config';

export function setCors(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
}

function isManifest(url: string, contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return url.includes('.m3u8') || ct.includes('mpegurl') || ct.includes('m3u');
}

function toProxyUrl(uri: string, baseUrl: string): string {
  try {
    const abs = new URL(uri, baseUrl).toString();
    return `${PROXY_BASE}/stream?u=${encodeURIComponent(abs)}`;
  } catch {
    return uri;
  }
}

function rewriteManifest(text: string, baseUrl: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;
      if (line.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => `URI="${toProxyUrl(uri, baseUrl)}"`);
      }
      return toProxyUrl(line.trim(), baseUrl);
    })
    .join('\n');
}

export function handleOptions(res: ServerResponse) {
  setCors(res);
  res.writeHead(204);
  res.end();
}

export async function handleStream(req: IncomingMessage, res: ServerResponse, rawUrl: string) {
  setCors(res);

  let target = rawUrl;
  if (!/^https?:\/\//i.test(target)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('URL invalida');
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'User-Agent': UPSTREAM_USER_AGENT,
      Accept: '*/*',
    };
    try {
      headers.Referer = new URL(target).origin + '/';
    } catch {
      /* ignore */
    }
    if (req.headers.range) headers.Range = req.headers.range;

    const upstream = await fetch(target, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!upstream.ok && upstream.status >= 400) {
      res.writeHead(upstream.status, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Upstream HTTP ${upstream.status}`);
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';

    if (isManifest(target, contentType)) {
      const text = await upstream.text();
      const rewritten = rewriteManifest(text, upstream.url || target);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
      });
      res.end(rewritten);
      return;
    }

    res.statusCode = upstream.status;
    res.setHeader('Content-Type', contentType);
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    const cr = upstream.headers.get('content-range');
    if (cr) res.setHeader('Content-Range', cr);
    const ar = upstream.headers.get('accept-ranges');
    if (ar) res.setHeader('Accept-Ranges', ar);

    if (!upstream.body) {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.pipe(res);
    nodeStream.on('error', () => res.destroy());
  } catch (err) {
    const message = (err as Error).name === 'AbortError' ? 'Timeout ao conectar no stream' : (err as Error).message;
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end(`Erro no proxy: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function handleLogo(_req: IncomingMessage, res: ServerResponse, rawUrl: string) {
  setCors(res);
  if (!/^https?:\/\//i.test(rawUrl)) {
    res.writeHead(400);
    res.end();
    return;
  }
  try {
    const upstream = await fetch(rawUrl, { headers: { 'User-Agent': UPSTREAM_USER_AGENT, Accept: 'image/*' } });
    if (!upstream.ok || !upstream.body) {
      res.writeHead(upstream.status || 502);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
      'Cache-Control': 'public, max-age=86400',
    });
    Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  } catch {
    res.writeHead(502);
    res.end();
  }
}
