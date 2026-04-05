import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Sidebar from './components/Sidebar';
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

export default function App() {
  const { user, loading, error, init } = useAuthStore();

  useEffect(() => { init(); }, [init]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/login?return_to=/console/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Login with volta-auth</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar user={user} />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/members" element={<Members />} />
          <Route path="/invitations" element={<Invitations />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/idp" element={<IdpConfig />} />
          <Route path="/webhooks" element={<Webhooks />} />
          <Route path="/keys" element={<SigningKeys />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
