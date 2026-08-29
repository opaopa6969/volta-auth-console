// usePaginatedQuery の再 fetch トリガを固定する (#37)
//
// Members ページのテナント切替 / Invitations のステータスフィルタは
// URL params (page/size/sort/q) や filters を変えず、fetchFn の参照だけ
// 変える。fetchFn が依存配列に入っていないと、この経路で再 fetch が走らず
// 画面が前のテナント／前のステータスのままになる。
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePaginatedQuery } from './usePaginatedQuery';

const okResult = (items = []) => ({
  items,
  total: items.length,
  page: 1,
  size: 20,
  pages: 1,
});

function wrapper(initialPath = '/') {
  return function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };
}

describe('usePaginatedQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('マウント時に1回だけ fetch する', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResult([{ id: 1 }]));
    const { result } = renderHook(
      () => usePaginatedQuery(fetchFn, { defaultSize: 20 }),
      { wrapper: wrapper() },
    );

    // 初回 effect
    await act(() => Promise.resolve());
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([{ id: 1 }]);
  });

  it('fetchFn の参照が変わったら再 fetch する (#37)', async () => {
    // 同じ引数で呼ばれるが、返すデータが違う2つの関数を切り替える。
    // tenantId が変わったときの fetchMembers を模倣。
    const fetchA = vi.fn().mockResolvedValue(okResult([{ id: 'a1' }]));
    const fetchB = vi.fn().mockResolvedValue(okResult([{ id: 'b1' }]));

    let current = fetchA;
    const { result, rerender } = renderHook(
      () => usePaginatedQuery(current, { defaultSize: 20 }),
      { wrapper: wrapper() },
    );

    await act(() => Promise.resolve());
    expect(fetchA).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([{ id: 'a1' }]);

    // fetchFn を差し替える (テナント切替に相当)
    current = fetchB;
    rerender();

    await act(() => Promise.resolve());
    // fetchB が1回呼ばれ、data が差し替わる
    expect(fetchB).toHaveBeenCalledTimes(1);
    expect(fetchA).toHaveBeenCalledTimes(1); // 追加で呼ばれない
    expect(result.current.data).toEqual([{ id: 'b1' }]);
  });

  it('fetchFn が同じ参照なら再 fetch しない (#37 回帰)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResult([{ id: 1 }]));
    const { rerender } = renderHook(
      () => usePaginatedQuery(fetchFn, { defaultSize: 20 }),
      { wrapper: wrapper() },
    );

    await act(() => Promise.resolve());
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // 親が再描画しても fetchFn が同じなら再 fetch しない
    rerender();
    await act(() => Promise.resolve());
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('URL の page が変わったら再 fetch する', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okResult());
    renderHook(
      () => usePaginatedQuery(fetchFn, { defaultSize: 20 }),
      { wrapper: wrapper('/?page=2') },
    );

    await act(() => Promise.resolve());
    expect(fetchFn).toHaveBeenCalledTimes(1);
    // page=2 が params に渡る
    expect(fetchFn.mock.calls[0][0]).toMatchObject({ page: 2 });
  });
});
