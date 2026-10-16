import { describe, expect, it } from 'vitest';
import type { Channel } from './api';
import { buildChannelIndex, channelKey } from './channels';

function channel(id: string, name: string, tvgId: string | null = null): Channel {
  return { id, name, logo: null, groups: [], url: `http://example/${id}`, tvgId };
}

describe('buildChannelIndex', () => {
  it('numera os canais em ordem alfabetica (pt-BR)', () => {
    const { list } = buildChannelIndex(
      [channel('c3', 'Zulu'), channel('c1', 'Ação'), channel('c2', 'Beta')],
      {},
    );

    expect(list.map((c) => c.name)).toEqual(['Ação', 'Beta', 'Zulu']);
    expect(list.map((c) => c.number)).toEqual([1, 2, 3]);
  });

  it('respeita os numeros definidos pelo usuario (overrides)', () => {
    const { list, byId } = buildChannelIndex(
      [channel('c1', 'Alpha'), channel('c2', 'Beta')],
      { c2: 10 },
    );

    expect(byId.get('c2')?.number).toBe(10);
    expect(list[list.length - 1].id).toBe('c2');
  });

  it('da precedencia ao override quando dois canais disputam o mesmo numero', () => {
    const { byNumber } = buildChannelIndex(
      [channel('c1', 'Alpha'), channel('c2', 'Beta')],
      { c1: 2 },
    );

    expect(byNumber.get(2)?.id).toBe('c1');
  });

  it('preenche byNumber e byId para todos os canais', () => {
    const { list, byNumber, byId } = buildChannelIndex(
      [channel('c1', 'Alpha'), channel('c2', 'Beta')],
      {},
    );

    expect(byNumber.size).toBe(2);
    expect(byId.size).toBe(2);
    expect(byId.get('c1')?.name).toBe('Alpha');
    expect(list.every((c) => byId.get(c.id) === c)).toBe(true);
  });

  it('ignora overrides de canais inexistentes', () => {
    const { byNumber } = buildChannelIndex([channel('c1', 'Alpha')], { ghost: 5 });
    expect(byNumber.has(5)).toBe(false);
  });

  it('lida com lista vazia', () => {
    const { list, byNumber, byId } = buildChannelIndex([], {});
    expect(list).toEqual([]);
    expect(byNumber.size).toBe(0);
    expect(byId.size).toBe(0);
  });
});

describe('channelKey', () => {
  it('usa o tvgId quando presente', () => {
    expect(channelKey(channel('c1', 'Alpha', 'Globo'))).toBe('Globo');
  });

  it('cai para o id quando nao ha tvgId', () => {
    expect(channelKey(channel('c1', 'Alpha'))).toBe('c1');
  });
});
