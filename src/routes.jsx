// ルート定義の単一の置き場所 (#12)。
//
// これまで「どのページが管理者専用か」は Sidebar.jsx のリンク配列にだけ書かれて
// おり、App.jsx の <Route> は素通しだった。つまり **リンクが消えるだけで、URL を
// 直に打てば入れる**。サーバー側の認可が最終防衛線なのは変わらないが、入れてしまう
// 画面が 403 だらけになるのは UX として壊れている。
//
// ここに roles を宣言すると、Sidebar の表示と Route のガードが同じ定義から
// 生成される。片方だけ直して食い違う、という事故を構造的に防ぐのが狙い。
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Tenants from './pages/Tenants';
import Members from './pages/Members';
import Invitations from './pages/Invitations';
import Sessions from './pages/Sessions';
import Audit from './pages/Audit';
import IdpConfig from './pages/IdpConfig';
import Webhooks from './pages/Webhooks';
import SigningKeys from './pages/SigningKeys';
import Settings from './pages/Settings';
import Monitor from './pages/Monitor';

/** 管理者相当とみなすロール。 */
export const ADMIN_ROLES = ['ADMIN', 'OWNER'];

/**
 * `roles` を省略したルートは誰でも入れる（サーバー側の認可に任せる）。
 * `roles` を書いたルートは、Sidebar に出さず、直接 URL でも入れない。
 */
export const routes = [
  { to: '/',            label: 'Dashboard',    icon: '📊', element: <Dashboard /> },
  { to: '/users',       label: 'Users',        icon: '👤', element: <Users /> },
  { to: '/tenants',     label: 'Tenants',      icon: '🏢', element: <Tenants /> },
  { to: '/members',     label: 'Members',      icon: '👥', element: <Members /> },
  { to: '/invitations', label: 'Invitations',  icon: '✉️', element: <Invitations /> },
  { to: '/sessions',    label: 'Sessions',     icon: '🔑', element: <Sessions /> },
  { to: '/audit',       label: 'Audit Log',    icon: '📋', element: <Audit /> },
  { to: '/idp',         label: 'IdP Config',   icon: '🔐', element: <IdpConfig /> },
  { to: '/webhooks',    label: 'Webhooks',     icon: '🔗', element: <Webhooks /> },
  { to: '/keys',        label: 'Signing Keys', icon: '🗝️', element: <SigningKeys />, roles: ADMIN_ROLES },
  { to: '/monitor',     label: 'Monitor',      icon: '📡', element: <Monitor />,     roles: ADMIN_ROLES },
  { to: '/settings',    label: 'Settings',     icon: '⚙️', element: <Settings /> },
];

/** そのロールがこのルートに入れるか。 */
export function canAccess(route, role) {
  if (!route.roles) return true;
  return route.roles.includes(role);
}

/** Sidebar に出すルート。 */
export function visibleRoutes(role) {
  return routes.filter(r => canAccess(r, role));
}
