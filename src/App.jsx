import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useAuthFlow } from './hooks/useAuthFlow';
import Sidebar from './components/Sidebar';
import { routes, canAccess } from './routes';

/** roles を満たさないルートに入ったときの表示（#12）。 */
function Forbidden({ roles }) {
  return (
    <div className="text-center py-20">
      <p className="text-red-400 mb-2">この画面には権限がありません</p>
      <p className="text-xs text-gray-500">必要なロール: {roles.join(' / ')}</p>
    </div>
  );
}

export default function App() {
  const { user, loading, error, authenticated } = useAuthStore();

  // tramli session-resume flow — syncs result into authStore
  useAuthFlow();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!authenticated) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Not authenticated'}</p>
          <a href={`/login?return_to=${returnTo}`} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Login with volta-auth
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar user={user} />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          {routes.map(route => (
            <Route
              key={route.to}
              path={route.to}
              element={
                canAccess(route, user?.role)
                  ? route.element
                  : <Forbidden roles={route.roles} />
              }
            />
          ))}
        </Routes>
      </main>
    </div>
  );
}
