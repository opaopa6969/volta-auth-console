import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'displayName', label: 'Name' },
  { key: 'role', label: 'Role', render: (v) => {
    const colors = { OWNER: 'text-yellow-400', ADMIN: 'text-blue-400', MEMBER: 'text-green-400', VIEWER: 'text-gray-400' };
    return <span className={`font-mono font-bold ${colors[v] || ''}`}>{v}</span>;
  }},
];

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;

  useEffect(() => {
    if (!tenantId) return;
    api.listMembers(tenantId).then(setMembers).finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Members ({members.length})</h2>
      <DataTable columns={columns} data={members} searchKeys={['email', 'displayName']} />
    </div>
  );
}
