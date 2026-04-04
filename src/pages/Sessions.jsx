import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'displayName', label: 'Name' },
  { key: 'device', label: 'Device' },
  { key: 'ip', label: 'IP' },
  { key: 'lastActive', label: 'Last Active', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
  { key: 'expiresAt', label: 'Expires', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
];

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [totalActive, setTotalActive] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    fetch('/admin/sessions', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .catch(() => {
        // Fallback: admin sessions endpoint returns HTML, use the API
        return api.mySessions().then(data => {
          setTotalActive(data.length);
          return data;
        });
      })
      .then(data => {
        if (Array.isArray(data)) setSessions(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-1">Sessions</h2>
      <p className="text-sm text-gray-400 mb-4">Active: {sessions.length}</p>
      <DataTable columns={columns} data={sessions} searchKeys={['email', 'displayName', 'ip']} />
    </div>
  );
}
