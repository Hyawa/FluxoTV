import type { IncomingMessage, ServerResponse } from 'node:http';
import { getChannels } from './playlist';
import { ensureEpg, epgStatus, getNowNext } from './epg';
import { getSettings, saveSettings } from './settings';
import { handleLogo, handleOptions, handleStream, setCors } from './proxy';

function json(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function getQueryParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key);
  return value ?? null;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://127.0.0.1`);

  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  try {
    if (url.pathname === '/api/health') {
      setCors(res);
      json(res, 200, { status: 'ok', service: 'iptv-core' });
      return;
    }

    if (url.pathname === '/api/playlist') {
      setCors(res);
      const force = url.searchParams.get('refresh') === '1';
      const channels = await getChannels(force);
      const groups = Array.from(new Set(channels.flatMap((c) => c.groups))).sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      );
      json(res, 200, { count: channels.length, groups, channels });
      return;
    }

    if (url.pathname === '/api/settings') {
      setCors(res);
      if (req.method === 'POST') {
        const raw = await readBody(req);
        let patch: { epgUrl?: string } = {};
        try {
          patch = JSON.parse(raw) as { epgUrl?: string };
        } catch {
          json(res, 400, { error: 'JSON invalido' });
          return;
        }
        const saved = await saveSettings({
          epgUrl: typeof patch.epgUrl === 'string' ? patch.epgUrl.trim() : undefined,
        });
        void ensureEpg();
        json(res, 200, saved);
        return;
      }
      json(res, 200, await getSettings());
      return;
    }

    if (url.pathname === '/api/epg/status') {
      setCors(res);
      ensureEpg();
      json(res, 200, epgStatus());
      return;
    }

    if (url.pathname === '/api/epg/now') {
      setCors(res);
      ensureEpg();
      const ids = (getQueryParam(url, 'ids') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      json(res, 200, { results: getNowNext(ids) });
      return;
    }

    if (url.pathname === '/stream') {
      const target = getQueryParam(url, 'u');
      if (!target) {
        setCors(res);
        json(res, 400, { error: 'Parametro "u" obrigatorio' });
        return;
      }
      await handleStream(req, res, target);
      return;
    }

    if (url.pathname === '/api/logo') {
      const target = getQueryParam(url, 'u');
      if (!target) {
        setCors(res);
        json(res, 400, { error: 'Parametro "u" obrigatorio' });
        return;
      }
      await handleLogo(req, res, target);
      return;
    }

    setCors(res);
    json(res, 404, { error: 'Rota nao encontrada' });
  } catch (err) {
    if (!res.headersSent) {
      setCors(res);
      json(res, 500, { error: (err as Error).message });
    } else {
      res.end();
    }
  }
}
