/**
 * ロール階層。auth-core の `PolicyEngine::default_policy()` と一致させること。
 *
 * ずれると「UI では選べるのに API が 400 を返す」「UI に出ないロールが
 * 実際には存在する」という形で静かに壊れる。順序は強い順。
 */
export const ROLE_HIERARCHY = ['OWNER', 'ADMIN', 'OPERATOR', 'MEMBER', 'VIEWER'];

export const ROLE_COLORS = {
  OWNER: 'text-yellow-400',
  ADMIN: 'text-blue-400',
  OPERATOR: 'text-orange-400',
  MEMBER: 'text-green-400',
  VIEWER: 'text-gray-400',
};

export const ROLE_DESCRIPTIONS = {
  OWNER: 'テナントの所有者。削除・譲渡・署名鍵まで',
  ADMIN: 'メンバー招待とテナント設定',
  OPERATOR: '運用操作（ターミナル・再起動・ログ）。組織は触れない',
  MEMBER: 'アプリの利用',
  VIEWER: '閲覧のみ',
};

const rank = (role) => {
  const i = ROLE_HIERARCHY.indexOf(String(role || '').toUpperCase());
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};

/** a が b と同等以上か。未知のロールは「満たせない」扱い（API と同じ fail-closed）。 */
export function isAtLeast(a, b) {
  const ra = rank(a);
  const rb = rank(b);
  if (ra === Number.MAX_SAFE_INTEGER || rb === Number.MAX_SAFE_INTEGER) return false;
  return ra <= rb;
}

/**
 * `myRole` の人が付与できるロール。
 *
 * API 側 (`authorize_role_change`) と同じ規則にしてある。UI で選べるのに
 * 403 になるのは分かりにくいので、そもそも出さない。
 */
export function assignableRoles(myRole) {
  if (!myRole) return [];
  return ROLE_HIERARCHY.filter(r => isAtLeast(myRole, r));
}

/** `myRole` の人が `targetRole` の相手を操作できるか。 */
export function canManage(myRole, targetRole) {
  return isAtLeast(myRole, targetRole);
}
