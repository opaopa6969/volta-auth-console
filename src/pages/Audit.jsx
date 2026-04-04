import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'timestamp', label: 'Time', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
  { key: 'event', label: 'Event', render: (v) => {
    const c = v?.startsWith('ERROR') ? 'text-red-400' : v?.includes('SUCCESS') ? 'text-green-400' : 'text-gray-300';
    return <span className={`font-mono text-xs ${c}`}>{v}</span>;
  }},
  { key: 'actorEmail', label: 'Actor' },
  { key: 'targetType', label: 'Target' },
  { key: 'targetId', label: 'Target ID', render: (v) => <span className="font-mono text-xs">{v?.slice(0, 12)}</span> },
  { key: 'requestId', label: 'Request', render: (v) => <span className="font-mono text-xs text-gray-500">{v?.slice(0, 8)}</span> },
];

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listAudit().then(setLogs).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Audit Log ({logs.length})</h2>
      <DataTable columns={columns} data={logs} searchKeys={['event', 'actorEmail', 'targetId']} pageSize={50} />
    </div>
  );
}
