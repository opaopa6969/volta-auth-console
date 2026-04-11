import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import ServerDataTable from '../components/ServerDataTable';

const columns = [
  { key: 'userId', label: 'User ID', render: (v) => <span className="font-mono text-xs">{v?.slice(0, 8)}</span> },
  { key: 'role', label: 'Role', render: (v) => {
    const colors = { OWNER: 'text-yellow-400', ADMIN: 'text-blue-400', MEMBER: 'text-green-400', VIEWER: 'text-gray-400' };
    return <span className={`font-mono font-bold ${colors[v] || ''}`}>{v}</span>;
  }},
  { key: 'active', label: 'Status', sortable: false, render: (v) => v ? '🟢 Active' : '🔴 Inactive' },
];

export default function Members() {
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;

  const fetchMembers = useCallback((params) => {
    if (!tenantId) return Promise.resolve({ items: [], total: 0, page: 1, size: 20, pages: 0 });
    return api.listMembers(tenantId, params);
  }, [tenantId]);

  const pq = usePaginatedQuery(fetchMembers, { defaultSize: 20 });

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Members {pq.total > 0 && `(${pq.total})`}</h2>
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
        searchPlaceholder="Search by user ID or role..."
      />
    </div>
  );
}
