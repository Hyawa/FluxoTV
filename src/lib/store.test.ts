// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadState, saveState } from './store';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('store', () => {
  it('retorna o estado padrao quando nao ha nada salvo', () => {
    expect(loadState()).toEqual({ numbers: {}, lastId: null, volume: 1 });
  });

  it('faz round-trip de save/load', () => {
    saveState({ numbers: { c1: 5 }, lastId: 'c1', volume: 0.4 });
    expect(loadState()).toEqual({ numbers: { c1: 5 }, lastId: 'c1', volume: 0.4 });
  });

  it('retorna o padrao quando o JSON esta corrompido', () => {
    localStorage.setItem('iptv.tvbox.v1', '{ not json');
    expect(loadState()).toEqual({ numbers: {}, lastId: null, volume: 1 });
  });

  it('preenche valores ausentes/invalidos com o padrao', () => {
    localStorage.setItem('iptv.tvbox.v1', JSON.stringify({ volume: 'alto' }));
    expect(loadState()).toEqual({ numbers: {}, lastId: null, volume: 1 });
  });

  it('preserva valores parcialmente validos', () => {
    localStorage.setItem('iptv.tvbox.v1', JSON.stringify({ lastId: 'c9', volume: 0 }));
    expect(loadState()).toEqual({ numbers: {}, lastId: 'c9', volume: 0 });
  });

  it('nao lanca erro quando o localStorage falha ao salvar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => saveState({ numbers: {}, lastId: null, volume: 1 })).not.toThrow();
  });
});
