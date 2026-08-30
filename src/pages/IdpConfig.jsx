import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'type', label: 'Type', render: (v) => <span className="font-mono">{v}</span> },
  { key: 'issuer', label: 'Issuer' },
  { key: 'enabled', label: 'Status', render: (v) => v ? '🟢 Enabled' : '🔴 Disabled' },
];

export default function IdpConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  // #26: 選択中テナント（未選択なら user.tenantId → 所属先頭）
  const tenantId = useAuthStore(s => s.currentTenantId());

  useEffect(() => {
    // #42: tenantId が null(テナント未所属)のときは API を叩かない。
    // Loading 解除は render 側で tenantId === null を見て行う(
    // effect 内で setLoading(false) すると lint: set-state-in-effect に触れ、
    // cascading render の恐れがあるため)。
    if (!tenantId) return;
    api.listIdpConfigs(tenantId)
      .then(setConfigs)
      .catch(() => setConfigs([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  // #42: テナント未所属時は Loading を出さず空状態メッセージで案内する。
  // かつては useEffect 内で `if (!tenantId) return` して setLoading(false) を
  // 呼ばないため永遠に Loading になっていた。
  if (!tenantId) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Identity Providers</h2>
        <p className="text-gray-500">You do not belong to any tenant. IdP configurations are per-tenant.</p>
      </div>
    );
  }

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Identity Providers</h2>
      {configs.length === 0
        ? <p className="text-gray-500">No IdP configurations. Global providers (Google, GitHub) are configured via volta-config.yaml.</p>
        : <DataTable columns={columns} data={configs} searchKeys={['id', 'type']} />
      }
    </div>
  );
}
