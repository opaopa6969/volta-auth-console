import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([api.listUsers(), api.adminTenants(), api.listAudit()])
      .then(([users, tenants, audit]) => {
        setStats({
          totalUsers: users.length,
          totalTenants: tenants.length,
          recentLogins: audit.filter(a => a.event === 'LOGIN_SUCCESS').length,
          recentErrors: audit.filter(a => a.event?.startsWith('ERROR')).length,
        });
      })
      .catch(() => setStats({ totalUsers: '?', totalTenants: '?', recentLogins: '?', recentErrors: '?' }));
  }, []);

  if (!stats) return <div className="text-gray-400 p-8">Loading...</div>;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, color: 'blue' },
    { label: 'Tenants', value: stats.totalTenants, color: 'green' },
    { label: 'Recent Logins', value: stats.recentLogins, color: 'purple' },
    { label: 'Errors', value: stats.recentErrors, color: 'red' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`bg-gray-800 rounded-lg p-5 border border-gray-700`}>
            <p className="text-sm text-gray-400">{c.label}</p>
            <p className={`text-3xl font-bold mt-1 text-${c.color}-400`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
