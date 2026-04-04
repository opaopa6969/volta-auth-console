import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user) return;
    const fetchStat = (fn) => fn().then(d => Array.isArray(d) ? d : []).catch(() => []);
    Promise.all([fetchStat(api.listUsers), fetchStat(api.adminTenants), fetchStat(api.listAudit)])
      .then(([users, tenants, audit]) => {
        setStats({
          totalUsers: users.length,
          totalTenants: tenants.length,
          recentLogins: audit.filter(a => a.event === 'LOGIN_SUCCESS').length,
          recentErrors: audit.filter(a => a.event?.startsWith('ERROR')).length,
        });
      });
  }, [user]);

  if (!stats) return <div className="text-gray-400 p-8">Loading...</div>;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, bg: 'bg-blue-400' },
    { label: 'Tenants', value: stats.totalTenants, bg: 'bg-green-400' },
    { label: 'Recent Logins', value: stats.recentLogins, bg: 'bg-purple-400' },
    { label: 'Errors', value: stats.recentErrors, bg: 'bg-red-400' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{c.label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.bg.replace('bg-', 'text-')}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
