// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NowNext } from '@/lib/api';
import * as api from '@/lib/api';
import { useNowNext } from './useNowNext';

vi.mock('@/lib/api', () => ({ fetchNowNext: vi.fn() }));

const mockedFetchNowNext = vi.mocked(api.fetchNowNext);

afterEach(() => {
  vi.clearAllMocks();
});

describe('useNowNext', () => {
  it('nao busca nada quando desabilitado', async () => {
    const { result } = renderHook(() => useNowNext(['a'], false));
    await new Promise((r) => setTimeout(r, 200));
    expect(mockedFetchNowNext).not.toHaveBeenCalled();
    expect(result.current).toEqual({});
  });

  it('nao busca nada quando nao ha ids', async () => {
    const { result } = renderHook(() => useNowNext([], true));
    await new Promise((r) => setTimeout(r, 200));
    expect(mockedFetchNowNext).not.toHaveBeenCalled();
    expect(result.current).toEqual({});
  });

  it('busca apos o debounce e expoe os dados', async () => {
    const data: Record<string, NowNext> = { a: { current: null, next: null } };
    mockedFetchNowNext.mockResolvedValue(data);

    const { result } = renderHook(() => useNowNext(['a'], true));

    await waitFor(() => expect(result.current).toEqual(data));
    expect(mockedFetchNowNext).toHaveBeenCalledWith(['a']);
  });

  it('ignora erros do EPG (que e opcional)', async () => {
    mockedFetchNowNext.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useNowNext(['a'], true));

    await new Promise((r) => setTimeout(r, 250));
    expect(result.current).toEqual({});
  });
});
