import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    api.adminTenants().then(setTenants).catch(() => setTenants([])).finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const handleToggle = async (tenant) => {
    const action = tenant.suspended ? 'activate' : 'suspend';
    if (!confirm(`${action} tenant "${tenant.name}"?`)) return;
    try {
      if (tenant.suspended) {
        await api.activateTenant(tenant.id);
      } else {
        await api.suspendTenant(tenant.id);
      }
      refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'plan', label: 'Plan' },
    { key: 'mfaRequired', label: 'MFA', render: (v) => v ? '🔒 Required' : 'Optional' },
    { key: 'memberCount', label: 'Members' },
    { key: 'suspended', label: 'Status', render: (v, row) => (
      <button onClick={() => handleToggle(row)}
        className={`text-xs px-2 py-0.5 rounded ${v ? 'bg-red-900/50 text-red-400 hover:bg-red-800/50' : 'bg-green-900/50 text-green-400 hover:bg-green-800/50'}`}>
        {v ? 'Suspended' : 'Active'}
      </button>
    )},
  ];

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Tenants ({tenants.length})</h2>
      <DataTable columns={columns} data={tenants} searchKeys={['name', 'slug']} />
    </div>
  );
}
