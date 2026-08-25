import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, setUnauthorizedHandler } from './api.js'

describe('api - error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws Unauthorized on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({}),
    })
    await expect(api.me()).rejects.toThrow('Unauthorized')
  })

  it('throws with detail message on error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({ detail: 'Bad request detail' }),
    })
    await expect(api.me()).rejects.toThrow('Bad request detail')
  })

  it('throws with error.message when detail is absent', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({ error: { message: 'Internal error' } }),
    })
    await expect(api.me()).rejects.toThrow('Internal error')
  })

  it('throws HTTP status on unknown error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 503,
      ok: false,
      json: async () => ({}),
    })
    await expect(api.me()).rejects.toThrow('HTTP 503')
  })

  it('returns json on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ id: '123', email: 'user@example.com' }),
    })
    const result = await api.me()
    expect(result).toEqual({ id: '123', email: 'user@example.com' })
  })

  it('sends credentials include', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({}),
    })
    await api.me()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('items() unwraps .items array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [{ id: 1 }] }),
    })
    const result = await api.adminTenants()
    expect(result).toEqual([{ id: 1 }])
  })

  it('items() returns raw when no items key', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [{ id: 1 }],
    })
    const result = await api.adminTenants()
    expect(result).toEqual([{ id: 1 }])
  })
})

describe('api - URL construction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listUsers with params appends query string', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, size: 20, pages: 1 }),
    })
    await api.listUsers({ page: 2, q: 'alice' })
    const url = globalThis.fetch.mock.calls[0][0]
    expect(url).toContain('page=2')
    expect(url).toContain('q=alice')
  })

  it('listUsers with params filters null values', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [] }),
    })
    await api.listUsers({ page: 1, q: null })
    const url = globalThis.fetch.mock.calls[0][0]
    expect(url).not.toContain('q=')
  })

  it('listUsers with params filters empty string values', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [] }),
    })
    await api.listUsers({ page: 1, q: '' })
    const url = globalThis.fetch.mock.calls[0][0]
    expect(url).not.toContain('q=')
  })

  it('listUsers without params hits base path', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ items: [{ id: 2 }] }),
    })
    const result = await api.listUsers()
    expect(result).toEqual([{ id: 2 }])
    const url = globalThis.fetch.mock.calls[0][0]
    expect(url).toContain('/admin/users')
    expect(url).not.toContain('?')
  })
})

// ── 破壊的操作の回帰テスト (#22) ────────────────────────────────────
//
// これらは「押したら戻せない」操作なので、宛先 URL とメソッドが変わったことに
// 気付けないと事故になる（別テナントのメンバーを消す、想定と違う鍵を回す等）。
// UI ではなく API 契約の層で固定する。
describe('api - 破壊的操作の宛先とメソッド', () => {
  const okResponse = () => ({ status: 200, ok: true, json: async () => ({}) })

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse())
  })

  const cases = [
    {
      name: 'suspendTenant',
      call: () => api.suspendTenant('t1'),
      url: '/api/v1/admin/tenants/t1/suspend',
      method: 'POST',
    },
    {
      name: 'activateTenant',
      call: () => api.activateTenant('t1'),
      url: '/api/v1/admin/tenants/t1/activate',
      method: 'POST',
    },
    {
      name: 'revokeSession',
      call: () => api.revokeSession('s1'),
      url: '/api/v1/users/me/sessions/s1',
      method: 'DELETE',
    },
    {
      name: 'rotateKeys',
      call: () => api.rotateKeys(),
      url: '/api/v1/admin/keys/rotate',
      method: 'POST',
    },
    {
      name: 'adminResetMfa',
      call: () => api.adminResetMfa('t1', 'u1'),
      url: '/api/v1/tenants/t1/members/u1/mfa',
      method: 'DELETE',
    },
    {
      name: 'deleteInvitation',
      call: () => api.deleteInvitation('t1', 'i1'),
      url: '/api/v1/tenants/t1/invitations/i1',
      method: 'DELETE',
    },
    {
      name: 'deleteWebhook',
      call: () => api.deleteWebhook('t1', 'w1'),
      url: '/api/v1/tenants/t1/webhooks/w1',
      method: 'DELETE',
    },
  ]

  for (const c of cases) {
    it(`${c.name} は ${c.method} ${c.url} を叩く`, async () => {
      await c.call()
      const [url, options] = globalThis.fetch.mock.calls[0]
      expect(url).toBe(c.url)
      expect(options.method).toBe(c.method)
      // Cookie セッションが要る（credentials を落とすと 401 になる）
      expect(options.credentials).toBe('include')
    })
  }

  it('テナント ID を渡し忘れると URL に undefined が入る（呼び出し側で防ぐ契約）', async () => {
    await api.adminResetMfa(undefined, 'u1')
    const [url] = globalThis.fetch.mock.calls[0]
    // 事故の形をテストで見えるようにしておく。ページ側は tenantId が null のとき
    // API を呼ばない（currentTenantId() が null を返す）。
    expect(url).toContain('undefined')
  })
})

// ── 401 のグローバル通知 (#24) ─────────────────────────────────────
describe('api - 401 ハンドラ', () => {
  it('401 でハンドラが呼ばれる', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({}) })

    await expect(api.me()).rejects.toThrow('Unauthorized')
    expect(handler).toHaveBeenCalledTimes(1)
    setUnauthorizedHandler(null)
  })

  it('同時に複数 401 でもハンドラは1回だけ（リダイレクトの二重発火を防ぐ）', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({}) })

    await Promise.all([
      api.me().catch(() => {}),
      api.myTenants().catch(() => {}),
      api.listUsers().catch(() => {}),
    ])
    expect(handler).toHaveBeenCalledTimes(1)
    setUnauthorizedHandler(null)
  })

  it('2xx ではハンドラを呼ばない', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    globalThis.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({}) })

    await api.me()
    expect(handler).not.toHaveBeenCalled()
    setUnauthorizedHandler(null)
  })
})
