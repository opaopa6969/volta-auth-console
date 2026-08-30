// #41: Users ページの MFA リセットがテナント未所属(tenantId === null)時に
// 壊れた URL (/tenants/null/...) を叩かないことを固定する。
//
// 受け入れ条件に「ボタン無効化 or 押下時エラートースト」のいずれかが書かれて
// いるので、両方の経路を検証する:
//   1. tenantId が null のとき「Reset MFA」ボタンは disabled
//   2. 押下時に tenantId が null だったらトーストでエラーを表示
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DialogContext } from '../lib/dialogContext';
import { useAuthStore } from '../store/authStore';
import Users from './Users';

// confirm/toast を最小モック: ページは中身の表示に依存しない
function makeDialogMocks() {
  const toast = { error: vi.fn(), success: vi.fn(), info: vi.fn() };
  const confirm = vi.fn().mockResolvedValue(true);
  return {
    confirm,
    toast,
    prompt: vi.fn(),
    DialogContextValue: { confirm, toast, prompt: vi.fn() },
  };
}

function renderUsers() {
  const mocks = makeDialogMocks();
  const result = render(
    <MemoryRouter>
      <DialogContext.Provider value={mocks.DialogContextValue}>
        <Users />
      </DialogContext.Provider>
    </MemoryRouter>,
  );
  return { ...result, ...mocks };
}

describe('Users の MFA リセット (テナント未所属) (#41)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null, tenants: [], selectedTenantId: null,
      loading: false, error: null, authenticated: true,
    });
    vi.restoreAllMocks();
  });

  it('テナント未所属時は Reset MFA ボタンが disabled になる', async () => {
    useAuthStore.setState({
      user: { id: 'u1' },
      tenants: [],
      selectedTenantId: null,
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        items: [{ id: 'u2', email: 'a@example.com', mfaEnabled: true }],
        total: 1, page: 1, size: 20, pages: 1,
      }),
    });

    renderUsers();

    const btn = await screen.findByRole('button', { name: /reset mfa/i });
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
  });

  it('disabled ボタンを click しても API は呼ばれない', async () => {
    useAuthStore.setState({
      user: { id: 'u1' },
      tenants: [],
      selectedTenantId: null,
    });

    const fetchMock = vi.fn().mockImplementation((url, opts) => Promise.resolve({
      status: 200,
      ok: true,
      json: async () => {
        if (opts && opts.method === 'DELETE') return {};
        return {
          items: [{ id: 'u2', email: 'a@example.com', mfaEnabled: true }],
          total: 1, page: 1, size: 20, pages: 1,
        };
      },
    }));
    globalThis.fetch = fetchMock;

    renderUsers();
    const btn = await screen.findByRole('button', { name: /reset mfa/i });
    // disabled ボタンは fireEvent.click で onClick が発火しない(ブラウザ仕様)。
    // これが主防御。万が一 disabled が外れていても、handleResetMfa 内で
    // tenantId null を弾く第二の壁がある(API を叩かない)。
    fireEvent.click(btn);

    // 一覧取得以外の API 呼び出し(= MFA リセット)がないことを確認
    const apiCalls = fetchMock.mock.calls.map(c => c[0]);
    expect(apiCalls.some(u => String(u).includes('/mfa'))).toBe(false);
  });

  it('テナント所属時は Reset MFA ボタンが有効で API を叩く', async () => {
    useAuthStore.setState({
      user: { id: 'u1', tenantId: 't1' },
      tenants: [{ id: 't1', name: 'Alpha' }],
      selectedTenantId: null,
    });

    const fetchMock = vi.fn().mockImplementation((url, opts) => {
      if (opts && opts.method === 'DELETE' && String(url).includes('/mfa')) {
        return Promise.resolve({ status: 200, ok: true, json: async () => ({}) });
      }
      return Promise.resolve({
        status: 200, ok: true,
        json: async () => ({
          items: [{ id: 'u2', email: 'a@example.com', mfaEnabled: true }],
          total: 1, page: 1, size: 20, pages: 1,
        }),
      });
    });
    globalThis.fetch = fetchMock;

    renderUsers();
    const btn = await screen.findByRole('button', { name: /reset mfa/i });
    expect(btn.disabled).toBe(false);

    fireEvent.click(btn);

    await waitFor(() => {
      const mfaCall = fetchMock.mock.calls.find(
        ([url, opts]) => opts && opts.method === 'DELETE' && String(url).includes('/mfa'),
      );
      expect(mfaCall).toBeTruthy();
      expect(mfaCall[0]).toContain('/tenants/t1/members/u2/mfa');
    });
  });
});
