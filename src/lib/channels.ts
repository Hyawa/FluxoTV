import type { Channel } from './api';

export interface NumberedChannel extends Channel {
  number: number;
}

export interface ChannelIndex {
  list: NumberedChannel[];
  byNumber: Map<number, NumberedChannel>;
  byId: Map<string, NumberedChannel>;
}

/**
 * Assigns a channel number to every channel. Base numbers follow the
 * alphabetical order (like cable operators do), and user overrides win.
 */
export function buildChannelIndex(
  channels: Channel[],
  overrides: Record<string, number>,
): ChannelIndex {
  const sorted = [...channels].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );

  const list: NumberedChannel[] = sorted.map((channel, i) => ({
    ...channel,
    number: overrides[channel.id] ?? i + 1,
  }));

  const byNumber = new Map<number, NumberedChannel>();
  for (const nc of list) {
    if (overrides[nc.id] !== undefined) byNumber.set(nc.number, nc);
  }
  for (const nc of list) {
    if (!byNumber.has(nc.number)) byNumber.set(nc.number, nc);
  }

  const byId = new Map(list.map((nc) => [nc.id, nc]));
  list.sort((a, b) => a.number - b.number || a.name.localeCompare(b.name, 'pt-BR'));

  return { list, byNumber, byId };
}

export function channelKey(channel: Channel): string {
  return channel.tvgId ?? channel.id;
}
