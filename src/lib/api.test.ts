import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CORE_URL,
  fetchNowNext,
  fetchPlaylist,
  logoUrl,
  streamUrl,
  waitForCore,
} from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(impl: (url: string) => Partial<Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    return impl(url) as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('url builders', () => {
  it('usa o servidor local por padrao', () => {
    expect(CORE_URL).toBe('http://127.0.0.1:8787');
  });

  it('monta a url de stream com encode do parametro', () => {
    expect(streamUrl('http://a.b/live x.m3u8&y=1')).toBe(
      `${CORE_URL}/stream?u=${encodeURIComponent('http://a.b/live x.m3u8&y=1')}`,
    );
  });

  it('monta a url de logo com encode do parametro', () => {
    expect(logoUrl('http://a.b/logo.png?a=1')).toBe(
      `${CORE_URL}/api/logo?u=${encodeURIComponent('http://a.b/logo.png?a=1')}`,
    );
  });
});

describe('fetchPlaylist', () => {
  it('retorna os dados quando a resposta e ok', async () => {
    const data = { count: 1, groups: ['G'], channels: [] };
    stubFetch(() => ({ ok: true, json: async () => data }));

    await expect(fetchPlaylist()).resolves.toEqual(data);
  });

  it('lanca erro com o status quando a resposta nao e ok', async () => {
    stubFetch(() => ({ ok: false, status: 503 }));

    await expect(fetchPlaylist()).rejects.toThrow('HTTP 503');
  });
});

describe('fetchNowNext', () => {
  it('nao chama a rede e retorna vazio quando nao ha ids', async () => {
    const fn = stubFetch(() => ({ ok: true, json: async () => ({ results: {} }) }));

    await expect(fetchNowNext([])).resolves.toEqual({});
    expect(fn).not.toHaveBeenCalled();
  });

  it('deduplica os ids na query', async () => {
    const fn = stubFetch(() => ({ ok: true, json: async () => ({ results: {} }) }));

    await fetchNowNext(['a', 'a', 'b']);

    expect(fn).toHaveBeenCalledTimes(1);
    const calledUrl = String(fn.mock.calls[0][0]);
    expect(calledUrl).toContain(encodeURIComponent('a,b'));
  });

  it('retorna vazio quando a resposta nao e ok', async () => {
    stubFetch(() => ({ ok: false, status: 500 }));

    await expect(fetchNowNext(['a'])).resolves.toEqual({});
  });
});

describe('waitForCore', () => {
  it('resolve assim que o core responde ok', async () => {
    stubFetch(() => ({ ok: true }));
    await expect(waitForCore()).resolves.toBeUndefined();
  });

  it('lanca erro quando estoura o timeout', async () => {
    await expect(waitForCore(0)).rejects.toThrow('Servidor local nao respondeu');
  });
});
