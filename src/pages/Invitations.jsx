import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

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
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;

  const refresh = () => {
    if (!tenantId) return;
    api.listInvitations(tenantId).then(setInvitations).finally(() => setLoading(false));
  };

  useEffect(refresh, [tenantId]);

  const handleCreate = async () => {
    const email = prompt('Restrict to email (leave empty for any):');
    const role = prompt('Role (MEMBER/ADMIN):', 'MEMBER');
    if (role === null) return;
    await api.createInvitation(tenantId, { email: email || undefined, role });
    refresh();
  };

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Invitations ({invitations.length})</h2>
        <button onClick={handleCreate}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          + Create Invitation
        </button>
      </div>
      <DataTable columns={columns} data={invitations} searchKeys={['email', 'code']} />
    </div>
  );
}
