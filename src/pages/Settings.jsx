import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

export default function Settings() {
  const user = useAuthStore(s => s.user);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [mfaStatus, setMfaStatus] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (user) setDisplayName(user.displayName || '');
    api.me().then(u => setDisplayName(u.displayName || u.display_name || '')).catch(() => {});
    fetch('/api/v1/users/me/mfa', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setMfaStatus)
      .catch(() => {});
    api.mySessions().then(setSessions).catch(() => {});
  }, [user]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await fetch(`/api/v1/users/${user.userId || user.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (session) => {
    if (!confirm(`Revoke session from ${session.ip || session.ipAddress || 'unknown'}?`)) return;
    try {
      await api.revokeSession(session.id);
      setSessions(s => s.filter(x => x.id !== session.id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-xl font-bold text-white">Settings</h2>

      {/* Profile */}
      <section className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Profile</h3>
        <form onSubmit={handleSaveName} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Display Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm" />
          </div>
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
        <p className="text-xs text-gray-600 mt-2">Email: {user?.email}</p>
      </section>

      {/* MFA */}
      <section className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Security — MFA</h3>
        {mfaStatus === null ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : mfaStatus?.totp?.enabled ? (
          <div>
            <p className="text-sm text-green-400">🔒 TOTP enabled (setup: {mfaStatus.totp.setupAt ? new Date(mfaStatus.totp.setupAt).toLocaleDateString('ja-JP') : '-'})</p>
            <p className="text-xs text-gray-500 mt-1">Recovery codes remaining: {mfaStatus.recovery_codes_remaining ?? '-'}</p>
            <a href="/settings/security" className="text-xs text-blue-400 hover:underline mt-2 inline-block">
              Manage MFA on auth portal →
            </a>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400">MFA is not enabled.</p>
            <a href="/settings/security" className="text-xs text-blue-400 hover:underline mt-2 inline-block">
              Set up MFA on auth portal →
            </a>
          </div>
        )}
      </section>

      {/* Sessions */}
      <section className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Active Sessions ({sessions.length})</h3>
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between text-sm bg-gray-800 rounded px-3 py-2">
              <div>
                <span className="text-gray-300">{s.device || s.browser || '-'}</span>
                <span className="text-gray-600 ml-2">{s.ip || s.ipAddress || '-'}</span>
                <span className="text-gray-600 ml-2 text-xs">
                  {(s.lastActive || s.last_active_at) ? new Date(s.lastActive || s.last_active_at).toLocaleString('ja-JP') : ''}
                </span>
              </div>
              <button onClick={() => handleRevoke(s)}
                className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-400 hover:bg-red-800/50">
                Revoke
              </button>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-gray-600 text-sm">No active sessions</p>}
        </div>
      </section>
    </div>
  );
}
