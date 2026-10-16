import { describe, expect, it } from 'vitest';
import { formatRange, formatTime } from './format';

describe('formatTime', () => {
  it('formata no padrao HH:MM', () => {
    const at = new Date(2020, 0, 1, 14, 5).getTime();
    expect(formatTime(at)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatTime(at)).toBe('14:05');
  });

  it('preenche com zero a esquerda', () => {
    const at = new Date(2020, 0, 1, 9, 3).getTime();
    expect(formatTime(at)).toBe('09:03');
  });
});

describe('formatRange', () => {
  it('junta inicio e fim com um traco', () => {
    const start = new Date(2020, 0, 1, 20, 0).getTime();
    const stop = new Date(2020, 0, 1, 21, 30).getTime();
    expect(formatRange(start, stop)).toBe('20:00 - 21:30');
  });
});
