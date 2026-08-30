// #42: IdpConfig がテナント未所属(tenantId === null)のとき
// 永遠に Loading にならないことを固定する。
//
// 従来は useEffect 内で `if (!tenantId) return;` して setConfigs/setLoading
// を呼ばないため、loading が true のまま画面が進まなかった。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '../store/authStore';
import IdpConfig from './IdpConfig';

describe('IdpConfig のテナント未所属挙動 (#42)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null, tenants: [], selectedTenantId: null,
      loading: false, error: null, authenticated: true,
    });
    vi.restoreAllMocks();
  });

  it('テナント未所属時は Loading から抜けて空状態メッセージを表示する', async () => {
    useAuthStore.setState({
      user: { id: 'u1' },
      tenants: [],
      selectedTenantId: null,
    });

    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    render(<IdpConfig />);

    // 永遠に Loading に留まらないこと
    await waitFor(() => {
      expect(screen.getByText(/do not belong to any tenant/i)).toBeTruthy();
    });
    // API を叩かない
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('テナント所属時は API を叩いて一覧を表示する', async () => {
    useAuthStore.setState({
      user: { id: 'u1', tenantId: 't1' },
      tenants: [{ id: 't1', name: 'Alpha' }],
      selectedTenantId: null,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [
        { id: 'idp1', type: 'OIDC', issuer: 'https://example.com', enabled: true },
      ] }),
    });

    render(<IdpConfig />);

    await waitFor(() => {
      expect(screen.getByText('OIDC')).toBeTruthy();
    });
  });
});
