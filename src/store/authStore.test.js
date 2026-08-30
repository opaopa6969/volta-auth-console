// テナント選択の決定ロジックを固定する (#26, #22)
//
// 「どのテナントを操作しているのか」が暗黙だと、複数テナントの管理者が
// 意図しないテナントのメンバーを消す事故が起きうる。優先順位を明示的に固定する。
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

const TENANTS = [
  { id: 't-alpha', name: 'Alpha' },
  { id: 't-beta', name: 'Beta' },
];

describe('authStore のテナント選択', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null, tenants: [], selectedTenantId: null,
      loading: true, error: null, authenticated: false,
    });
  });

  it('未選択なら user.tenantId を使う', () => {
    useAuthStore.getState().setAuth({ tenantId: 't-beta' }, TENANTS);
    expect(useAuthStore.getState().currentTenantId()).toBe('t-beta');
  });

  it('user.tenantId が無ければ所属の先頭を使う', () => {
    useAuthStore.getState().setAuth({}, TENANTS);
    expect(useAuthStore.getState().currentTenantId()).toBe('t-alpha');
  });

  it('選択したテナントが user.tenantId より優先される', () => {
    useAuthStore.getState().setAuth({ tenantId: 't-beta' }, TENANTS);
    useAuthStore.getState().setSelectedTenantId('t-alpha');
    expect(useAuthStore.getState().currentTenantId()).toBe('t-alpha');
  });

  it('所属していないテナントの選択は無視する', () => {
    // 別アカウントで選んだ値が localStorage に残っている、権限が外れた、等。
    // そのまま API に投げると 403 になるので、所属内の値へフォールバックする。
    useAuthStore.getState().setAuth({ tenantId: 't-beta' }, TENANTS);
    useAuthStore.getState().setSelectedTenantId('t-not-mine');
    expect(useAuthStore.getState().currentTenantId()).toBe('t-beta');
  });

  it('選択は localStorage に永続化される', () => {
    useAuthStore.getState().setAuth({ tenantId: 't-beta' }, TENANTS);
    useAuthStore.getState().setSelectedTenantId('t-alpha');
    expect(localStorage.getItem('volta_selected_tenant')).toBe('t-alpha');

    useAuthStore.getState().setSelectedTenantId(null);
    expect(localStorage.getItem('volta_selected_tenant')).toBeNull();
  });

  it('テナントが1つも無ければ null（呼び出し側が API を叩かない判断に使う）', () => {
    useAuthStore.getState().setAuth({}, []);
    expect(useAuthStore.getState().currentTenantId()).toBeNull();
  });
});

// ── currentTenantId のフィールド形状フォールバック (#26) ──────────
//
// /users/me/tenants のテナントが id か tenantId かは時期で揺れた。両方を見ないと
// 「テナントを選択しているはずなのに所属無し扱いで null」になり、API に
// undefined が渡って /tenants/null/... 事故になる。
describe('authStore の currentTenantId — フィールド形状', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null, tenants: [], selectedTenantId: null,
      loading: true, error: null, authenticated: false,
    });
  });

  it('tenant.id 形状を認識する', () => {
    useAuthStore.getState().setAuth({}, [{ id: 't1', name: 'Alpha' }]);
    expect(useAuthStore.getState().currentTenantId()).toBe('t1');
  });

  it('tenant.tenantId 形状も認識する (#26 フォールバック)', () => {
    useAuthStore.getState().setAuth({}, [{ tenantId: 't2', name: 'Beta' }]);
    expect(useAuthStore.getState().currentTenantId()).toBe('t2');
  });

  it('selectedTenantId が tenant.tenantId 形状と一致しても選択される', () => {
    useAuthStore.getState().setAuth({}, [{ tenantId: 't2', name: 'Beta' }]);
    useAuthStore.getState().setSelectedTenantId('t2');
    expect(useAuthStore.getState().currentTenantId()).toBe('t2');
  });

  it('user.tenantId が存在すれば所属が空でも fallback する', () => {
    // /users/me が tenantId を返すが /users/me/tenants が未所属を返す
    // (レース等) 場合の防御
    useAuthStore.getState().setAuth({ tenantId: 't-orphan' }, []);
    expect(useAuthStore.getState().currentTenantId()).toBe('t-orphan');
  });
});
