import { useCallback } from 'react';
import { api } from '../lib/api';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import ServerDataTable from '../components/ServerDataTable';

export default function Sessions() {
  const fetchSessions = useCallback((params) => api.listSessions(params), []);
  const pq = usePaginatedQuery(fetchSessions, { defaultSize: 20 });

  const handleRevoke = async (session) => {
    if (!confirm(`Revoke session from ${session.ip || 'unknown IP'}?`)) return;
    try {
      await api.revokeSession(session.id);
      pq.refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'displayName', label: 'Name' },
    { key: 'device', label: 'Device', sortable: false, render: (v, row) => v || (row.userAgent || row.user_agent || '-').substring(0, 40) },
    { key: 'ip', label: 'IP', sortable: false, render: (v, row) => v || row.ipAddress || row.ip_address || '-' },
    { key: 'lastActive', label: 'Last Active', render: (v, row) => {
      const d = v || row.last_active_at;
      return d ? new Date(d).toLocaleString('ja-JP') : '-';
    }},
    { key: '_actions', label: '', sortable: false, render: (_, row) => (
      <button onClick={() => handleRevoke(row)}
        className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-400 hover:bg-red-800/50">
        Revoke
      </button>
    )},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Sessions</h2>
          {pq.total > 0 && <p className="text-sm text-gray-400">Active: {pq.total}</p>}
        </div>
        <button onClick={pq.refresh} className="text-sm text-gray-400 hover:text-white">Refresh</button>
      </div>
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
        searchPlaceholder="Search by email or IP..."
      />
    </div>
  );
}
