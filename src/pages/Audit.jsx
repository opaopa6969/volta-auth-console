import { useState, useCallback } from 'react';
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
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [eventFilter, setEventFilter] = useState('');

  const fetchAudit = useCallback((params) => {
    const merged = { ...params };
    if (dateRange.from) merged.from = dateRange.from;
    if (dateRange.to) merged.to = dateRange.to;
    if (eventFilter) merged.event = eventFilter;
    return api.listAudit(merged);
  }, [dateRange, eventFilter]);

  const pq = usePaginatedQuery(fetchAudit, { defaultSize: 50 });

  const handleDateChange = (range) => {
    setDateRange(range);
  };

  const handleEventChange = (e) => {
    setEventFilter(e.target.value);
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
