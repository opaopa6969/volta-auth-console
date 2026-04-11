import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import ServerDataTable from '../components/ServerDataTable';

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'displayName', label: 'Name' },
  { key: 'mfaEnabled', label: 'MFA', sortable: false, render: (v) => v ? '🔒' : '—' },
  { key: 'active', label: 'Status', sortable: false, render: (v) => v ? '🟢' : '🔴' },
  { key: 'createdAt', label: 'Created', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
];

export default function Users() {
  const user = useAuthStore(s => s.user);

  const fetchUsers = useCallback((params) => api.listUsers(params), []);
  const pq = usePaginatedQuery(fetchUsers, { defaultSize: 20, defaultSort: 'email' });

  const handleResetMfa = async (userId) => {
    if (!confirm('Reset MFA for this user? They will need to set up MFA again.')) return;
    try {
      await api.adminResetMfa(user?.tenantId, userId);
      pq.refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const columnsWithActions = [
    ...columns,
    { key: '_actions', label: '', sortable: false, render: (_, row) =>
      row.mfaEnabled ? (
        <button onClick={() => handleResetMfa(row.id)}
          className="text-[10px] px-2 py-0.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50">
          Reset MFA
        </button>
      ) : null
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Users {pq.total > 0 && `(${pq.total})`}</h2>
      <ServerDataTable
        columns={columnsWithActions}
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
        searchPlaceholder="Search by email or name..."
      />
    </div>
  );
}
