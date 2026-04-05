import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    api.mySessions()
      .then(data => { if (Array.isArray(data)) setSessions(data); })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const handleRevoke = async (session) => {
    if (!confirm(`Revoke session from ${session.ip || 'unknown IP'}?`)) return;
    try {
      await api.revokeSession(session.id);
      refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'displayName', label: 'Name' },
    { key: 'device', label: 'Device', render: (v, row) => v || (row.userAgent || row.user_agent || '-').substring(0, 40) },
    { key: 'ip', label: 'IP', render: (v, row) => v || row.ipAddress || row.ip_address || '-' },
    { key: 'lastActive', label: 'Last Active', render: (v, row) => {
      const d = v || row.last_active_at;
      return d ? new Date(d).toLocaleString('ja-JP') : '-';
    }},
    { key: '_actions', label: '', render: (_, row) => (
      <button onClick={() => handleRevoke(row)}
        className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-400 hover:bg-red-800/50">
        Revoke
      </button>
    )},
  ];

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Sessions</h2>
          <p className="text-sm text-gray-400">Active: {sessions.length}</p>
        </div>
        <button onClick={refresh} className="text-sm text-gray-400 hover:text-white">Refresh</button>
      </div>
      <DataTable columns={columns} data={sessions} searchKeys={['email', 'displayName', 'ip', 'ipAddress']} />
    </div>
  );
}
