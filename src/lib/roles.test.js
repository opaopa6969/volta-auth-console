// ロール階層の認可判定を固定する (#22)
//
// roles.js は Members ページのロール変更 UI / Sidebar の表示判定の根っこにある
// 純粋関数。これが壊れると「UI では選べるのに API が 403」「未知ロールが
// 通ってしまう」等の静かな事故になる。auth-core の PolicyEngine と一致させる
// 契約なので、境界値・未知値の挙動を固定する。
import { describe, it, expect } from 'vitest';
import {
  ROLE_HIERARCHY,
  isAtLeast,
  assignableRoles,
  canManage,
} from './roles';

describe('isAtLeast — 境界値', () => {
  it('同じロールは true (自分自身を満たす)', () => {
    for (const r of ROLE_HIERARCHY) {
      expect(isAtLeast(r, r)).toBe(true);
    }
  });

  it('OWNER は全ロールを満たす', () => {
    for (const r of ROLE_HIERARCHY) {
      expect(isAtLeast('OWNER', r)).toBe(true);
    }
  });

  it('VIEWER は自分以外を満たさない', () => {
    for (const r of ROLE_HIERARCHY) {
      if (r === 'VIEWER') continue;
      expect(isAtLeast('VIEWER', r)).toBe(false);
    }
  });

  it('大文字小文字を区別しない (API が lowercase で返す経路がある)', () => {
    expect(isAtLeast('owner', 'ADMIN')).toBe(true);
    expect(isAtLeast('Admin', 'member')).toBe(true);
  });
});

describe('isAtLeast — 未知ロールは fail-closed', () => {
  it('未知のロールは何も満たさない', () => {
    expect(isAtLeast('SUPERUSER', 'VIEWER')).toBe(false);
    expect(isAtLeast('OWNER', 'SUPERUSER')).toBe(false);
  });

  it('両方未知でも false', () => {
    expect(isAtLeast('FOO', 'BAR')).toBe(false);
  });

  it('null / undefined は false', () => {
    expect(isAtLeast(null, 'VIEWER')).toBe(false);
    expect(isAtLeast('OWNER', null)).toBe(false);
    expect(isAtLeast(undefined, undefined)).toBe(false);
  });
});

describe('assignableRoles — 付与可能ロール', () => {
  it('OWNER は全ロールを付与できる', () => {
    expect(assignableRoles('OWNER')).toEqual(ROLE_HIERARCHY);
  });

  it('ADMIN は OWNER を付与できない', () => {
    const roles = assignableRoles('ADMIN');
    expect(roles).not.toContain('OWNER');
    expect(roles).toEqual(['ADMIN', 'OPERATOR', 'MEMBER', 'VIEWER']);
  });

  it('VIEWER は自分自身のみ', () => {
    expect(assignableRoles('VIEWER')).toEqual(['VIEWER']);
  });

  it('null / undefined / 空文字 は空配列 (未ログイン等の防御)', () => {
    expect(assignableRoles(null)).toEqual([]);
    expect(assignableRoles(undefined)).toEqual([]);
    expect(assignableRoles('')).toEqual([]);
  });

  it('未知ロールは空配列 (fail-closed)', () => {
    expect(assignableRoles('SUPERUSER')).toEqual([]);
  });
});

describe('canManage — 操作権限', () => {
  it('OWNER は ADMIN を管理できる', () => {
    expect(canManage('OWNER', 'ADMIN')).toBe(true);
  });

  it('ADMIN は OWNER を管理できない (逆方向は不可)', () => {
    expect(canManage('ADMIN', 'OWNER')).toBe(false);
  });

  it('同ロールは管理できる', () => {
    expect(canManage('MEMBER', 'MEMBER')).toBe(true);
  });

  it('未知ロール相手は管理できない', () => {
    expect(canManage('OWNER', 'SUPERUSER')).toBe(false);
    expect(canManage('SUPERUSER', 'VIEWER')).toBe(false);
  });
});
