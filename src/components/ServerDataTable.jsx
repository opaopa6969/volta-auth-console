import { useState, useRef } from 'react';

function Pagination({ page, pages, total, size, onPageChange }) {
  if (pages <= 1) return null;

  const range = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(pages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) range.push(i);

  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
      <span>Showing {from}-{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30">&lt;</button>
        {start > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">1</button>
            {start > 2 && <span className="px-1">...</span>}
          </>
        )}
        {range.map(p => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-2 py-1 rounded ${p === page ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}>
            {p}
          </button>
        ))}
        {end < pages && (
          <>
            {end < pages - 1 && <span className="px-1">...</span>}
            <button onClick={() => onPageChange(pages)} className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700">{pages}</button>
          </>
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
          className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30">&gt;</button>
      </div>
    </div>
  );
}

export default function ServerDataTable({
  columns,
  data,
  page,
  pages,
  total,
  size,
  sort,
  search,
  isLoading,
  onPageChange,
  onSortChange,
  onSearchChange,
  onSearchSubmit,
  onSizeChange,
  searchPlaceholder = 'Search...',
  showSearch = true,
  extraFilters,
}) {
  const [searchInput, setSearchInput] = useState(search || '');
  const inputRef = useRef(null);
  const [lastSyncedSearch, setLastSyncedSearch] = useState(search);

  // Sync external search prop changes (e.g., browser back) via derived state pattern
  if (search !== lastSyncedSearch) {
    setLastSyncedSearch(search);
    setSearchInput(search || '');
  }

  const handleSearchInput = (e) => {
    const v = e.target.value;
    setSearchInput(v);
    onSearchChange?.(v);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearchSubmit?.(searchInput);
    } else if (e.key === 'Escape') {
      setSearchInput('');
      onSearchSubmit?.('');
      inputRef.current?.blur();
    }
  };

  const currentSort = sort || '';
  const sortCol = currentSort.replace(/^-/, '');
  const sortDir = currentSort.startsWith('-') ? 'desc' : 'asc';

  const toggleSort = (key) => {
    if (sortCol === key) {
      onSortChange?.(sortDir === 'asc' ? `-${key}` : key);
    } else {
      onSortChange?.(key);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {showSearch && (
          <input
            ref={inputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={handleSearchInput}
            onKeyDown={handleSearchKeyDown}
            className="px-3 py-1.5 text-sm border border-gray-700 rounded bg-gray-800 text-gray-200 focus:outline-none focus:border-blue-500 w-64"
          />
        )}
        {extraFilters}
        {onSizeChange && (
          <select value={size} onChange={e => onSizeChange(Number(e.target.value))}
            className="px-2 py-1.5 text-sm border border-gray-700 rounded bg-gray-800 text-gray-200 focus:outline-none focus:border-blue-500">
            {[10, 25, 50, 100].map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-950/50 flex items-center justify-center z-10">
            <span className="text-gray-400 text-sm">Loading...</span>
          </div>
        )}
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-400 uppercase bg-gray-800">
            <tr>
              {columns.map(col => (
                <th key={col.key}
                  className={`px-4 py-2 select-none ${col.sortable !== false ? 'cursor-pointer hover:text-white' : ''}`}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}>
                  {col.label}{' '}
                  {col.sortable !== false && sortCol === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id || i} className="border-b border-gray-800 hover:bg-gray-800/50">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-2 text-gray-300">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && !isLoading && (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} size={size} onPageChange={onPageChange} />
    </div>
  );
}
