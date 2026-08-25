import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import AuthFlowStatus from '../components/AuthFlowStatus';

// #25: 以前は users / tenants / audit を**全件**取ってきて
// `length` と `filter().length` で数えていた。テナントが増えるほど転送量が増え、
// audit のように行数が伸び続けるテーブルでは、ダッシュボードを開くだけで数万行を
// 引くことになる。数が欲しいだけなので、サーバー側のページネーションの `total`
// を使う（size=1 で1行だけ受け取る）。
const COUNT_ONLY = { page: 1, size: 1 };

/** paginated レスポンスの total だけを取る。取れなければ null（「不明」を表示）。 */
async function countOf(fn) {
  try {
    const res = await fn(COUNT_ONLY);
    if (typeof res?.total === 'number') return res.total;
    // ページネーション未対応のエンドポイントは配列が返る。その場合だけ length。
    if (Array.isArray(res)) return res.length;
    if (Array.isArray(res?.items)) return res.items.length;
    return null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [totalUsers, totalTenants, recentLogins, recentErrors] = await Promise.all([
        countOf(api.listUsers),
        countOf(api.adminTenants),
        // イベント種別で絞った件数はサーバーに数えさせる。ERROR_* は前方一致で
        // 複数種類あるため、代表的な2つ（auth / mfa）の合算で見る。
        countOf((p) => api.listAudit({ ...p, event: 'LOGIN_SUCCESS' })),
        Promise.all([
          countOf((p) => api.listAudit({ ...p, event: 'ERROR_AUTH' })),
          countOf((p) => api.listAudit({ ...p, event: 'ERROR_MFA' })),
        ]).then(([a, b]) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0))),
      ]);

      if (!cancelled) {
        setStats({ totalUsers, totalTenants, recentLogins, recentErrors });
      }
    })();

    return () => { cancelled = true; };
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <AuthFlowStatus state="AUTHENTICATED" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <p className="text-sm text-gray-400">{c.label}</p>
            {/* 取得できなかったときに 0 と出すと「0件」と誤読されるので明示的に - にする */}
            <p className={`text-3xl font-bold mt-1 ${c.bg.replace('bg-', 'text-')}`}>
              {c.value == null ? '-' : c.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
