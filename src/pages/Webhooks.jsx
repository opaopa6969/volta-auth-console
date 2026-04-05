import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ endpoint_url: '', events: '' });
  const [saving, setSaving] = useState(false);
  const user = useAuthStore(s => s.user);
  const tid = user?.tenantId;

  const refresh = () => {
    if (!tid) return;
    setLoading(true);
    api.listWebhooks(tid).then(setWebhooks).catch(() => setWebhooks([])).finally(() => setLoading(false));
  };

  useEffect(refresh, [tid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.endpoint_url.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.updateWebhook(tid, editing.id, { endpoint_url: form.endpoint_url, events: form.events });
      } else {
        await api.createWebhook(tid, { endpoint_url: form.endpoint_url, events: form.events });
      }
      setShowForm(false);
      setEditing(null);
      setForm({ endpoint_url: '', events: '' });
      refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (wh) => {
    setEditing(wh);
    setForm({ endpoint_url: wh.endpointUrl || wh.endpoint_url || wh.url || '', events: wh.events || '' });
    setShowForm(true);
  };

  const handleDelete = async (wh) => {
    if (!confirm(`Delete webhook ${wh.endpointUrl || wh.url}?`)) return;
    await api.deleteWebhook(tid, wh.id);
    refresh();
  };

  const handleToggle = async (wh) => {
    await api.updateWebhook(tid, wh.id, { is_active: !wh.active });
    refresh();
  };

  const columns = [
    { key: 'endpointUrl', label: 'URL', render: (v, row) => v || row.url || '-' },
    { key: 'events', label: 'Events', render: (v) => Array.isArray(v) ? v.join(', ') : v },
    { key: 'active', label: 'Status', render: (v, row) => {
      const active = v ?? row.enabled;
      return (
        <button onClick={() => handleToggle(row)} className={`text-xs px-2 py-0.5 rounded ${active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          {active ? 'Active' : 'Inactive'}
        </button>
      );
    }},
    { key: '_actions', label: '', render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={() => handleEdit(row)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
        <button onClick={() => handleDelete(row)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
      </div>
    )},
  ];

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Webhooks ({webhooks.length})</h2>
        <button onClick={() => { setEditing(null); setForm({ endpoint_url: '', events: '' }); setShowForm(true); }}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500">
          + Create
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Endpoint URL</label>
            <input type="url" required value={form.endpoint_url} onChange={e => setForm(f => ({ ...f, endpoint_url: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Events (comma-separated)</label>
            <input type="text" value={form.events} onChange={e => setForm(f => ({ ...f, events: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm" placeholder="member.joined, user.deleted" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 disabled:opacity-50">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600">
              Cancel
            </button>
          </div>
        </form>
      )}

      <DataTable columns={columns} data={webhooks} searchKeys={['endpointUrl', 'url']} />
    </div>
  );
}
