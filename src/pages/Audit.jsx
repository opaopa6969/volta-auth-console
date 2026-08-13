import { useCallback } from 'react';
import { api } from '../lib/api';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import ServerDataTable from '../components/ServerDataTable';
import DateRangeFilter from '../components/DateRangeFilter';

const EVENT_TYPES = ['', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'ERROR_AUTH', 'ERROR_MFA', 'MFA_ENROLLED', 'MFA_VERIFIED'];

const columns = [
  { key: 'timestamp', label: 'Time', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
  { key: 'event', label: 'Event', render: (v) => {
    const c = v?.startsWith('ERROR') ? 'text-red-400' : v?.includes('SUCCESS') ? 'text-green-400' : 'text-gray-300';
    return <span className={`font-mono text-xs ${c}`}>{v}</span>;
  }},
  { key: 'actorEmail', label: 'Actor' },
  { key: 'targetType', label: 'Target' },
  { key: 'targetId', label: 'Target ID', render: (v) => <span className="font-mono text-xs">{v?.slice(0, 12)}</span> },
  { key: 'requestId', label: 'Request', sortable: false, render: (v) => <span className="font-mono text-xs text-gray-500">{v?.slice(0, 8)}</span> },
];

export default function Audit() {
  // #18: 以前は event / 日付をローカル state と pq.filters の両方に持ち、
  // handleEventChange が setEventFilter と pq.setFilters を同時に呼んでいた。
  // 同じ値が2箇所にあるとどちらが効くのか読めないので、pq.filters に一本化する
  // （hook が現在値を返すようにした）。fetchAudit は params をそのまま渡すだけ。
  const fetchAudit = useCallback((params) => api.listAudit(params), []);

  const pq = usePaginatedQuery(fetchAudit, { defaultSize: 50 });

  const eventFilter = pq.filters.event ?? '';
  const dateRange = { from: pq.filters.from ?? null, to: pq.filters.to ?? null };

  const handleDateChange = (range) => {
    pq.setFilters(prev => ({
      ...prev,
      from: range.from || undefined,
      to: range.to || undefined,
    }));
  };

  const handleEventChange = (e) => {
    pq.setFilters(prev => ({ ...prev, event: e.target.value || undefined }));
  };

  const extraFilters = (
    <div className="flex items-center gap-3 flex-wrap">
      <select value={eventFilter} onChange={handleEventChange}
        className="px-2 py-1.5 text-sm border border-gray-700 rounded bg-gray-800 text-gray-200 focus:outline-none focus:border-blue-500">
        <option value="">All events</option>
        {EVENT_TYPES.filter(Boolean).map(e => (
          <option key={e} value={e}>{e}</option>
        ))}
      </select>
      <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={handleDateChange} />
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Audit Log {pq.total > 0 && `(${pq.total})`}</h2>
      <ServerDataTable
        columns={columns}
        data={pq.data}
        page={pq.page}
        pages={pq.pages}
        total={pq.total}
        size={pq.size}
        sort={pq.sort}
        search={pq.search}
        isLoading={pq.isLoading}
        onPageChange={pq.setPage}
        onSortChange={pq.setSort}
        onSearchChange={pq.setSearch}
        onSearchSubmit={pq.setSearchImmediate}
        onSizeChange={pq.setSize}
        searchPlaceholder="Search by event, actor, target..."
        extraFilters={extraFilters}
      />
    </div>
  );
}
