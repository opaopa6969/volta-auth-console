import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/users', label: 'Users', icon: '👤' },
  { to: '/tenants', label: 'Tenants', icon: '🏢' },
  { to: '/members', label: 'Members', icon: '👥' },
  { to: '/invitations', label: 'Invitations', icon: '✉️' },
  { to: '/sessions', label: 'Sessions', icon: '🔑' },
  { to: '/audit', label: 'Audit Log', icon: '📋' },
  { to: '/idp', label: 'IdP Config', icon: '🔐' },
  { to: '/webhooks', label: 'Webhooks', icon: '🔗' },
  { to: '/keys', label: 'Signing Keys', icon: '🗝️' },
];

export default function Sidebar({ user }) {
  return (
    <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">volta-auth</h1>
        <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
      </div>
      <nav className="flex-1 py-2">
        {links.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-800 transition-colors ${isActive ? 'bg-gray-800 text-white' : ''}`
            }>
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
        volta-auth-console v0.1.0
      </div>
    </aside>
  );
}
