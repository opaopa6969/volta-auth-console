import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'displayName', label: 'Name' },
  { key: 'locale', label: 'Locale' },
  { key: 'active', label: 'Status', render: (v) => v ? '🟢 active' : '🔴 inactive' },
  { key: 'createdAt', label: 'Created', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Users ({users.length})</h2>
      <DataTable columns={columns} data={users} searchKeys={['email', 'displayName']} />
    </div>
  );
}
