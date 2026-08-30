// #40: /sessions ページの Revoke が他人のセッションでも動くことを固定する。
//
// /sessions は /admin/sessions(管理者向け全セッション一覧)を表示するが、
// revokeSession は /users/me/sessions/:id(自分自身のみ)を叩くため、
// 他人のセッション ID を渡すと 404 になる。管理系ルート
// DELETE /admin/sessions/:id を使う adminRevokeSession に切り替えた。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DialogContext } from '../lib/dialogContext';
import Sessions from './Sessions';

function makeDialogMocks() {
  const toast = { error: vi.fn(), success: vi.fn(), info: vi.fn() };
  const confirm = vi.fn().mockResolvedValue(true);
  return {
    confirm,
    toast,
    DialogContextValue: { confirm, toast, prompt: vi.fn() },
  };
}

function renderSessions() {
  const mocks = makeDialogMocks();
  const result = render(
    <MemoryRouter>
      <DialogContext.Provider value={mocks.DialogContextValue}>
        <Sessions />
      </DialogContext.Provider>
    </MemoryRouter>,
  );
  return { ...result, ...mocks };
}

describe('Sessions の Revoke (#40)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Revoke は /admin/sessions/:id に DELETE を投げる(他人のセッションも失効可)', async () => {
    const fetchMock = vi.fn().mockImplementation((url, opts) => {
      if (opts && opts.method === 'DELETE') {
        return Promise.resolve({ status: 200, ok: true, json: async () => ({}) });
      }
      return Promise.resolve({
        status: 200, ok: true,
        json: async () => ({
          items: [
            { id: 'sess-other', email: 'other@example.com', ip: '10.0.0.1' },
          ],
          total: 1, page: 1, size: 20, pages: 1,
        }),
      });
    });
    globalThis.fetch = fetchMock;

    renderSessions();
    const revokeBtn = await screen.findByRole('button', { name: /revoke/i });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([, opts]) => opts && opts.method === 'DELETE',
      );
      expect(deleteCall).toBeTruthy();
      // /users/me/sessions/ ではなく /admin/sessions/ に投げる
      expect(deleteCall[0]).toBe('/api/v1/admin/sessions/sess-other');
      expect(deleteCall[0]).not.toContain('/users/me/sessions/');
    });
  });
});
