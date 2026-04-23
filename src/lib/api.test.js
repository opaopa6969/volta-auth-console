import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from './api.js'

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
