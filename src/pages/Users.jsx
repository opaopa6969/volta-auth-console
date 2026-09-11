import { useCallback, useState } from 'react';
import { api } from '../lib/api';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import { useCurrentTenant } from '../hooks/useCurrentTenant';
import ServerDataTable from '../components/ServerDataTable';
import { useConfirm, useToast } from '../lib/dialogContext';
import { assignableRoles } from '../lib/roles';

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'displayName', label: 'Name' },
  { key: 'mfaEnabled', label: 'MFA', sortable: false, render: (v) => v ? '🔒' : '—' },
  { key: 'active', label: 'Status', sortable: false, render: (v) => v ? '🟢' : '🔴' },
  { key: 'createdAt', label: 'Created', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
];

export default function Users() {
  const confirm = useConfirm();
  const toast = useToast();
  // #26: MFA リセットは「どのテナントのメンバーとして」操作するかで宛先が変わる。
  // 選択中テナント（未選択なら所属先頭）を使う。
  const { tenantId } = useCurrentTenant();
  const { myRole } = useCurrentTenant();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback((params) => api.listUsers(params), []);
  const pq = usePaginatedQuery(fetchUsers, { defaultSize: 20, defaultSort: 'email' });

  const handleResetMfa = async (userId) => {
    // #41: tenantId が null(テナント未所属)だと URL が /tenants/null/... になり
    // 404 になる。ボタン無効化で事故を防ぐ第一の壁、ここは押下時の第二の壁。
    if (!tenantId) {
      toast.error('No tenant selected. Cannot reset MFA without a tenant.');
      return;
    }
    if (!await confirm({ message: 'Reset MFA for this user? They will need to set up MFA again.', danger: true })) return;
    try {
      await api.adminResetMfa(tenantId, userId);
      pq.refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const creationRoles = assignableRoles(myRole).filter(r => ['ADMIN', 'MEMBER', 'VIEWER'].includes(r));
  const handleCreate = async (event) => {
    event.preventDefault();
    if (!tenantId) return toast.error('作成先のテナントを選択してください。');
    setCreating(true);
    try {
      await api.createUser(tenantId, { email, display_name: displayName, role });
      setEmail(''); setDisplayName(''); setRole('MEMBER');
      toast.success('ユーザーを事前登録しました。OIDC で初回ログインすると利用できます。');
      await pq.refresh();
    } catch (err) {
      toast.error(err.message);
    } finally { setCreating(false); }
  };

  const columnsWithActions = [
    ...columns,
    { key: '_actions', label: '', sortable: false, render: (_, row) =>
      row.mfaEnabled ? (
        <button onClick={() => handleResetMfa(row.id)}
          disabled={!tenantId}
          title={tenantId ? '' : 'No tenant selected'}
          className="text-[10px] px-2 py-0.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-900/30">
          Reset MFA
        </button>
      ) : null
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Users {pq.total > 0 && `(${pq.total})`}</h2>
      </div>
      {creationRoles.length > 0 && (
        <form onSubmit={handleCreate} className="mb-5 grid gap-3 rounded border border-gray-700 bg-gray-900/50 p-4 md:grid-cols-[1fr_1fr_10rem_auto]">
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com"
            className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100" />
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="表示名（任意）"
            className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100" />
          <select value={role} onChange={e => setRole(e.target.value)} className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100">
            {creationRoles.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <button disabled={creating || !tenantId} className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            {creating ? '作成中…' : '+ ユーザー作成'}
          </button>
          <p className="text-xs text-gray-400 md:col-span-4">パスワードは発行しません。登録メールアドレスで OIDC に初回ログインすると有効になります。</p>
        </form>
      )}
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
