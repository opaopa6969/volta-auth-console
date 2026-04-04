import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'type', label: 'Type', render: (v) => <span className="font-mono">{v}</span> },
  { key: 'issuer', label: 'Issuer' },
  { key: 'enabled', label: 'Status', render: (v) => v ? '🟢 Enabled' : '🔴 Disabled' },
];

export default function IdpConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user?.tenantId) return;
    api.listIdpConfigs(user.tenantId).then(setConfigs).catch(() => setConfigs([])).finally(() => setLoading(false));
  }, [user?.tenantId]);

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Identity Providers</h2>
      {configs.length === 0
        ? <p className="text-gray-500">No IdP configurations. Global providers (Google, GitHub) are configured via volta-config.yaml.</p>
        : <DataTable columns={columns} data={configs} searchKeys={['id', 'type']} />
      }
    </div>
  );
}
