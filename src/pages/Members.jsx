import { useCallback, useState } from 'react';
import { api } from '../lib/api';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import { useCurrentTenant } from '../hooks/useCurrentTenant';
import ServerDataTable from '../components/ServerDataTable';
import {
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  assignableRoles,
  canManage,
} from '../lib/roles';

function RoleCell({ row, myRole, onChange, busyId, error }) {
  const role = String(row.role || '').toUpperCase();
  const options = assignableRoles(myRole);

  // 変更できない相手は素の表示にする。選べないセレクトを出すより分かりやすい。
  const editable = canManage(myRole, role) && options.length > 0;
  if (!editable) {
    return <span className={`font-mono font-bold ${ROLE_COLORS[role] || ''}`}>{role || '-'}</span>;
  }

  const busy = busyId === row.id;
  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        disabled={busy}
        onChange={(e) => onChange(row, e.target.value)}
        className={`bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs font-mono
                    disabled:opacity-50 ${ROLE_COLORS[role] || ''}`}
        title={ROLE_DESCRIPTIONS[role] || ''}
      >
        {/* いま持っているロールが選択肢に無いことがある（OPERATOR 導入前の
            データなど）。消えると「変更していないのに変わった」ように見えるので、
            現在値は常に残す。 */}
        {!options.includes(role) && role && <option value={role}>{role}（現在）</option>}
        {options.map(r => (
          <option key={r} value={r} title={ROLE_DESCRIPTIONS[r]}>{r}</option>
        ))}
      </select>
      {busy && <span className="text-xs text-gray-500">保存中…</span>}
      {error && <span className="text-xs text-red-400" title={error}>失敗</span>}
    </div>
  );
}

export default function Members() {
  const { tenantId, tenants, myRole, setCurrentTenant } = useCurrentTenant();
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState({});

  const fetchMembers = useCallback((params) => {
    if (!tenantId) return Promise.resolve({ items: [], total: 0, page: 1, size: 20, pages: 0 });
    return api.listMembers(tenantId, params);
  }, [tenantId]);

  const pq = usePaginatedQuery(fetchMembers, { defaultSize: 20 });

  const changeRole = async (row, newRole) => {
    if (newRole === String(row.role || '').toUpperCase()) return;
    setBusyId(row.id);
    setErrors(prev => ({ ...prev, [row.id]: null }));
    try {
      await api.updateMember(tenantId, row.id, { role: newRole });
      await pq.refresh();
    } catch (err) {
      // API 側の規則（自分より上は付与できない・最後の OWNER は降格できない）で
      // 弾かれることがある。UI 側でも同じ規則で選択肢を絞っているが、
      // 二人が同時に触った場合など、最終判断は API 側にある。
      setErrors(prev => ({ ...prev, [row.id]: err?.message || '変更に失敗しました' }));
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'email',
      label: 'User',
      render: (v, row) => (
        <div className="flex flex-col">
          <span className="text-sm">{v || '(no email)'}</span>
          {row.display_name && <span className="text-xs text-gray-500">{row.display_name}</span>}
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (_v, row) => (
        <RoleCell
          row={row}
          myRole={myRole}
          onChange={changeRole}
          busyId={busyId}
          error={errors[row.id]}
        />
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: false,
      render: (v) => (v ? '🟢 Active' : '🔴 Inactive'),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-xl font-bold text-white">
          Members {pq.total > 0 && `(${pq.total})`}
        </h2>
        {tenants.length > 1 && (
          <select
            value={tenantId || ''}
            onChange={(e) => setCurrentTenant(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        {myRole && (
          <span className="text-xs text-gray-500">
            あなた: <span className={ROLE_COLORS[myRole]}>{myRole}</span>
          </span>
        )}
      </div>

      {!tenantId && (
        <p className="text-sm text-gray-400">所属テナントがありません。</p>
      )}

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
        searchPlaceholder="Search by email or role..."
      />
    </div>
  );
}
