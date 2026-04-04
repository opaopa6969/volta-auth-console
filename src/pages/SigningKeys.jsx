import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'kid', label: 'Key ID', render: (v) => <span className="font-mono text-xs">{v}</span> },
  { key: 'algorithm', label: 'Algorithm' },
  { key: 'status', label: 'Status', render: (v) => {
    const c = { ACTIVE: 'text-green-400', ROTATED: 'text-yellow-400', REVOKED: 'text-red-400' };
    return <span className={c[v] || 'text-gray-400'}>{v}</span>;
  }},
  { key: 'createdAt', label: 'Created', render: (v) => v ? new Date(v).toLocaleString('ja-JP') : '-' },
];

export default function SigningKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    api.listKeys().then(k => setKeys(Array.isArray(k) ? k : k.keys || [])).catch(() => setKeys([])).finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const handleRotate = async () => {
    if (!confirm('Rotate signing key? Active JWTs will still be valid until expiry.')) return;
    await api.rotateKeys();
    refresh();
  };

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Signing Keys</h2>
        <button onClick={handleRotate}
          className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700">
          Rotate Key
        </button>
      </div>
      <DataTable columns={columns} data={keys} />
    </div>
  );
}
