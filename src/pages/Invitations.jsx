import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import ServerDataTable from '../components/ServerDataTable';
import { usePrompt, useToast } from '../lib/dialogContext';

const STATUS_OPTIONS = ['', 'PENDING', 'USED', 'EXPIRED'];

const columns = [
  { key: 'code', label: 'Code', render: (v) => <span className="font-mono text-xs">{v?.slice(0, 12)}...</span> },
  { key: 'email', label: 'Restricted To' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status', render: (v) => {
    const c = { PENDING: 'text-yellow-400', USED: 'text-green-400', EXPIRED: 'text-gray-500' };
    return <span className={c[v] || ''}>{v}</span>;
  }},
  { key: 'expiresAt', label: 'Expires', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
];

export default function Invitations() {
  const prompt = usePrompt();
  const toast = useToast();
  // #26: 選択中テナント（未選択なら user.tenantId → 所属先頭）
  const tenantId = useAuthStore(s => s.currentTenantId());
  const [statusFilter, setStatusFilter] = useState('');

  const fetchInvitations = useCallback((params) => {
    if (!tenantId) return Promise.resolve({ items: [], total: 0, page: 1, size: 20, pages: 0 });
    const merged = { ...params };
    if (statusFilter) merged.status = statusFilter;
    return api.listInvitations(tenantId, merged);
  }, [tenantId, statusFilter]);

  const pq = usePaginatedQuery(fetchInvitations, { defaultSize: 20 });

  const handleCreate = async () => {
    // #27: ネイティブ prompt をアプリ内ダイアログに置き換えた。
    // email はキャンセル(null)と空文字を区別する必要がある（空 = 誰でも使える招待）。
    const email = await prompt({
      title: 'Create invitation',
      message: '招待を受け取れるメールアドレスを制限できます（空なら誰でも可）。',
      label: 'Email (optional)',
    });
    if (email === null) return;

    const role = await prompt({
      title: 'Create invitation',
      message: '付与するロールを入力してください。',
      label: 'Role (MEMBER / ADMIN)',
      defaultValue: 'MEMBER',
    });
    if (role === null) return;

    try {
      await api.createInvitation(tenantId, { email: email || undefined, role });
      pq.refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const extraFilters = (
    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
      className="px-2 py-1.5 text-sm border border-gray-700 rounded bg-gray-800 text-gray-200 focus:outline-none focus:border-blue-500">
      <option value="">All statuses</option>
      {STATUS_OPTIONS.filter(Boolean).map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Invitations {pq.total > 0 && `(${pq.total})`}</h2>
        <button onClick={handleCreate}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          + Create Invitation
        </button>
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
        searchPlaceholder="Search by email or code..."
        extraFilters={extraFilters}
      />
    </div>
  );
}
