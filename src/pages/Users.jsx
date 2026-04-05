import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'displayName', label: 'Name' },
  { key: 'mfaEnabled', label: 'MFA', render: (v) => v ? '🔒' : '—' },
  { key: 'active', label: 'Status', render: (v) => v ? '🟢' : '🔴' },
  { key: 'createdAt', label: 'Created', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);

  const refresh = () => {
    api.listUsers().then(setUsers).finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const handleResetMfa = async (userId) => {
    if (!confirm('Reset MFA for this user? They will need to set up MFA again.')) return;
    try {
      await api.adminResetMfa(user?.tenantId, userId);
      refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  const columnsWithActions = [
    ...columns,
    { key: '_actions', label: '', render: (_, row) =>
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
      <h2 className="text-xl font-bold text-white mb-4">Users ({users.length})</h2>
      <DataTable columns={columnsWithActions} data={users} searchKeys={['email', 'displayName']} />
    </div>
  );
}
