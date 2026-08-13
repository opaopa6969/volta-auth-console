// ルートの role ガードを固定する (#12, #22)
//
// 「Sidebar からリンクが消えているだけで、URL を直打ちすれば入れる」状態に戻らない
// ようにする。roles を宣言したルートは、表示からも遷移からも外れること。
import { describe, it, expect } from 'vitest';
import { routes, canAccess, visibleRoutes, ADMIN_ROLES } from './routes';

describe('routes の role ガード', () => {
  it('roles を宣言していないルートは誰でも入れる', () => {
    const open = routes.find(r => !r.roles);
    expect(open).toBeDefined();
    expect(canAccess(open, 'USER')).toBe(true);
    expect(canAccess(open, undefined)).toBe(true);
  });

  it('roles を宣言したルートは該当ロールだけ入れる', () => {
    const guarded = routes.filter(r => r.roles);
    // ガード付きのルートが1つも無ければ、この仕組み自体が効いていない
    expect(guarded.length).toBeGreaterThan(0);

    for (const route of guarded) {
      expect(canAccess(route, 'USER')).toBe(false);
      expect(canAccess(route, undefined)).toBe(false);
      for (const role of route.roles) {
        expect(canAccess(route, role)).toBe(true);
      }
    }
  });

  it('/monitor と /keys は管理者専用', () => {
    for (const path of ['/monitor', '/keys']) {
      const route = routes.find(r => r.to === path);
      expect(route, `${path} が routes に無い`).toBeDefined();
      expect(route.roles).toEqual(ADMIN_ROLES);
    }
  });

  it('visibleRoutes は入れないルートを落とす', () => {
    const userVisible = visibleRoutes('USER').map(r => r.to);
    const adminVisible = visibleRoutes('ADMIN').map(r => r.to);

    expect(userVisible).not.toContain('/monitor');
    expect(adminVisible).toContain('/monitor');
    // 管理者は一般ユーザーが見えるものを全部見える
    for (const to of userVisible) {
      expect(adminVisible).toContain(to);
    }
  });

  it('全ルートが element と label を持つ（Sidebar と Route の生成元が同じ）', () => {
    for (const route of routes) {
      expect(route.to, JSON.stringify(route)).toBeTruthy();
      expect(route.label, route.to).toBeTruthy();
      expect(route.element, route.to).toBeTruthy();
    }
  });
});
