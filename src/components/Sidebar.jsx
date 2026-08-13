import { NavLink } from 'react-router-dom';
import packageJson from '../../package.json';
import { visibleRoutes } from '../routes';
import { useAuthStore } from '../store/authStore';

export default function Sidebar({ user }) {
  // リンク一覧は src/routes.jsx が単一の出所（#12）。ここで独自に持たない。
  const links = visibleRoutes(user?.role);

  // #26: テナント固有ページ（Members / Invitations / Webhooks / IdP / MFA リセット）
  // がどのテナントを見ているのかを画面に出し、複数所属なら切り替えられるようにする。
  // 以前は user.tenantId の暗黙値で、複数テナントの管理者には何も見えなかった。
  const tenants = useAuthStore(s => s.tenants);
  const currentTenantId = useAuthStore(s => s.currentTenantId());
  const setSelectedTenantId = useAuthStore(s => s.setSelectedTenantId);
  const tenantName = tenants.find(t => (t.id || t.tenantId) === currentTenantId)?.name;

  return (
    <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">volta-auth</h1>
        <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
      </div>

      {/* テナント表示 / 切り替え (#26) */}
      {currentTenantId && (
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Tenant</p>
          {tenants.length > 1 ? (
            <select
              value={currentTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              aria-label="Tenant"
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-blue-500">
              {tenants.map(t => {
                const id = t.id || t.tenantId;
                return <option key={id} value={id}>{t.name || id}</option>;
              })}
            </select>
          ) : (
            <p className="text-xs text-gray-300 truncate" title={currentTenantId}>
              {tenantName || currentTenantId}
            </p>
          )}
        </div>
      )}
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
        volta-auth-console v{packageJson.version}
      </div>
    </aside>
  );
}
