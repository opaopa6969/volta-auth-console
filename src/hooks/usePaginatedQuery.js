import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Server-side paginated query hook with URL param sync.
 *
 * @param {(params: Record<string,string|number>) => Promise<{items,total,page,size,pages}>} fetchFn
 * @param {object} options
 * @param {number} [options.defaultSize=20]
 * @param {string} [options.defaultSort]
 */
export function usePaginatedQuery(fetchFn, { defaultSize = 20, defaultSort } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page')) || 1;
  const size = Number(searchParams.get('size')) || defaultSize;
  const sort = searchParams.get('sort') || defaultSort || '';
  const search = searchParams.get('q') || '';

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});

  const debounceRef = useRef(null);

  const updateParam = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value == null || value === '' || value === 0) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
      // Reset to page 1 when changing filters/search/sort
      if (key !== 'page') {
        next.delete('page');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setPage = useCallback((p) => updateParam('page', p), [updateParam]);
  const setSize = useCallback((s) => updateParam('size', s), [updateParam]);
  const setSort = useCallback((s) => updateParam('sort', s), [updateParam]);

  const setSearch = useCallback((q) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParam('q', q);
    }, 300);
  }, [updateParam]);

  const setSearchImmediate = useCallback((q) => {
    clearTimeout(debounceRef.current);
    updateParam('q', q);
  }, [updateParam]);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, size, ...filtersRef.current };
      if (sort) params.sort = sort;
      if (search) params.q = search;

      const result = await fetchFn(params);
      setData(result.items || []);
      setTotal(result.total || 0);
      setPages(result.pages || Math.ceil((result.total || 0) / size));
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, size, sort, search, fetchFn]);

  // Re-fetch when URL params, filters, or fetchFn change.
  // #37: fetchFn は呼び出し側が useCallback で依存(tenantId / statusFilter 等)を
  // 取り込んだ関数。それが変わったときも再 fetch しないと、Members のテナント切替・
  // Invitations のステータスフィルタ変更が URL params や filters を変えない限り
  // 画面に反映されない。fetchFn を依存に追加してこの経路を塞ぐ。
  useEffect(() => {
    refresh();
  }, [refresh, filters]);

  return {
    data,
    total,
    page,
    size,
    pages,
    sort,
    search,
    isLoading,
    error,
    setPage,
    setSize,
    setSort,
    setSearch,
    setSearchImmediate,
    // #18: 呼び出し側が「今どのフィルタが効いているか」を読めないと、同じ値を
    // ローカル state にも持つことになり二重管理になる。現在値も返す。
    filters,
    setFilters,
    refresh,
  };
}
