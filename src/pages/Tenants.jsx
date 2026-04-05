import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'plan', label: 'Plan' },
  { key: 'mfaRequired', label: 'MFA', render: (v) => v ? '🔒 Required' : 'Optional' },
  { key: 'memberCount', label: 'Members' },
  { key: 'suspended', label: 'Status', render: (v) => v ? '🔴 Suspended' : '🟢 Active' },
];

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminTenants().then(setTenants).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Tenants ({tenants.length})</h2>
      <DataTable columns={columns} data={tenants} searchKeys={['name', 'slug']} />
    </div>
  );
}
