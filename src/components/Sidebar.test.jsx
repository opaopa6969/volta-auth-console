// Sidebar の認可が「現在のテナントでの自分のロール」に基づくことを固定 (#38)
//
// 従来は user.role を参照していたが、/users/me は role を返さず
// /users/me/tenants 側にしか無い（テナントごとに違う）。そのため ADMIN/OWNER
// でも user.role === undefined となり /monitor・/keys が見えなかった。
// useCurrentTenant().myRole を使うことで、選択中テナントでのロールが
// 反映される。テナントごとにロールが違うユーザーは、テナントを切り替えると
// 管理者リンクの表示/非表示が切り替わる（仕様上正しい）。
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Sidebar from './Sidebar';

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar user={{ email: 'tester@example.com' }} />
    </MemoryRouter>,
  );
}

describe('Sidebar の認可 (#38)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ADMIN テナントを選択中は /monitor と /keys が表示される', () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'admin@example.com' },
      tenants: [{ id: 't1', name: 'Alpha', role: 'ADMIN' }],
      loading: false,
      authenticated: true,
      error: null,
      selectedTenantId: 't1',
    });

    renderSidebar();
    // NavLink のテキストとして label が出る
    expect(screen.getByText('Monitor')).toBeTruthy();
    expect(screen.getByText('Signing Keys')).toBeTruthy();
  });

  it('MEMBER テナントを選択中は /monitor と /keys が表示されない', () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'member@example.com' },
      tenants: [{ id: 't1', name: 'Alpha', role: 'MEMBER' }],
      loading: false,
      authenticated: true,
      error: null,
      selectedTenantId: 't1',
    });

    renderSidebar();
    expect(screen.queryByText('Monitor')).toBeNull();
    expect(screen.queryByText('Signing Keys')).toBeNull();
  });

  it('テナントを切り替えると管理者リンクの表示が切り替わる', () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'dual@example.com' },
      tenants: [
        { id: 't-admin', name: 'Admin Tenant', role: 'ADMIN' },
        { id: 't-member', name: 'Member Tenant', role: 'MEMBER' },
      ],
      loading: false,
      authenticated: true,
      error: null,
      selectedTenantId: 't-admin',
    });

    const { rerender } = renderSidebar();
    expect(screen.getByText('Monitor')).toBeTruthy();

    // テナントを MEMBER のほうへ切り替え
    useAuthStore.getState().setSelectedTenantId('t-member');
    rerender(
      <MemoryRouter>
        <Sidebar user={{ email: 'dual@example.com' }} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Monitor')).toBeNull();
    expect(screen.queryByText('Signing Keys')).toBeNull();
  });

  it('所属テナントが無いときは管理者リンクが出ない', () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'orphan@example.com' },
      tenants: [],
      loading: false,
      authenticated: true,
      error: null,
      selectedTenantId: null,
    });

    renderSidebar();
    expect(screen.queryByText('Monitor')).toBeNull();
    expect(screen.queryByText('Signing Keys')).toBeNull();
  });
});
