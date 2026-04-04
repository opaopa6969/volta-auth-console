import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'url', label: 'URL' },
  { key: 'events', label: 'Events', render: (v) => Array.isArray(v) ? v.join(', ') : v },
  { key: 'enabled', label: 'Status', render: (v) => v ? '🟢' : '🔴' },
];

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user?.tenantId) return;
    api.listWebhooks(user.tenantId).then(setWebhooks).catch(() => setWebhooks([])).finally(() => setLoading(false));
  }, [user?.tenantId]);

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Webhooks ({webhooks.length})</h2>
      <DataTable columns={columns} data={webhooks} searchKeys={['url']} />
    </div>
  );
}
