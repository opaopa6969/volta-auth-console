import { useAuthStore } from '../store/authStore';

/**
 * いま操作対象のテナントと、そこでの自分のロール。
 *
 * ロールは `/users/me` ではなく `/users/me/tenants` にしか無い（テナントごとに
 * 違うので当然だが、`user.role` を探して見つからず詰まりやすい）。
 * 「どのテナントの話か」を決めないとロールも決まらないので、両方ここで返す。
 */
export function useCurrentTenant() {
  const tenants = useAuthStore(s => s.tenants);
  const currentTenantId = useAuthStore(s => s.currentTenantId);
  const setCurrentTenant = useAuthStore(s => s.setCurrentTenant);

  const tenantId = currentTenantId ?? tenants[0]?.id ?? null;
  const tenant = tenants.find(t => t.id === tenantId) ?? null;

  return {
    tenantId,
    tenant,
    tenants,
    setCurrentTenant,
    myRole: tenant?.role ? String(tenant.role).toUpperCase() : null,
  };
}
