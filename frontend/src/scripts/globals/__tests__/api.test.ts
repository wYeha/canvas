/** Тесты клиента API: разбор успешного ответа схемой, виды ошибок, тело запроса, сбой сети. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { apiRequest, isUnavailable } from '@/scripts/globals/api'

/** Подменяет fetch: отвечает заданным статусом и телом (объект — как JSON). */
function stubFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn(() =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const itemSchema = z.object({ id: z.string() })

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('успешный ответ проверяется схемой', async () => {
    stubFetch(200, { id: 'a' })
    expect(await apiRequest('/x', { schema: itemSchema })).toEqual({ ok: true, data: { id: 'a' } })
  })

  it('ответ не того формата — invalid-response', async () => {
    stubFetch(200, { id: 1 })
    const result = await apiRequest('/x', { schema: itemSchema })
    expect(result).toMatchObject({ ok: false, error: { kind: 'invalid-response', status: 200 } })
  })

  it('без схемы тело не читается, 204 — успех', async () => {
    stubFetch(204)
    expect(await apiRequest('/x', { method: 'POST' })).toEqual({ ok: true, data: undefined })
  })

  it('шлёт JSON-тело под префиксом /api с cookie того же источника', async () => {
    const fetchMock = stubFetch(204)
    await apiRequest('/auth/login', { method: 'POST', body: { password: 'p' } })
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: '{"password":"p"}',
    })
  })

  it('401 — unauthorized с кодом и текстом сервера', async () => {
    stubFetch(401, { error: { code: 'INVALID_PASSWORD', message: 'Неверный пароль' } })
    expect(await apiRequest('/x')).toEqual({
      ok: false,
      error: { kind: 'unauthorized', status: 401, code: 'INVALID_PASSWORD', message: 'Неверный пароль' },
    })
  })

  it('4xx — rejected, 5xx — server (без тела ошибки — код и текст null)', async () => {
    stubFetch(429, { error: { code: 'RATE_LIMITED', message: 'Подождите' } })
    expect(await apiRequest('/x')).toMatchObject({ ok: false, error: { kind: 'rejected', code: 'RATE_LIMITED' } })
    stubFetch(502)
    expect(await apiRequest('/x')).toEqual({
      ok: false,
      error: { kind: 'server', status: 502, code: null, message: null },
    })
  })

  it('сбой сети — network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    expect(await apiRequest('/x')).toEqual({
      ok: false,
      error: { kind: 'network', status: null, code: null, message: null },
    })
  })
})

describe('isUnavailable', () => {
  it('сеть и 5xx — недоступен, остальное — нет', () => {
    const base = { status: null, code: null, message: null }
    expect(isUnavailable({ ...base, kind: 'network' })).toBe(true)
    expect(isUnavailable({ ...base, kind: 'server' })).toBe(true)
    expect(isUnavailable({ ...base, kind: 'unauthorized' })).toBe(false)
    expect(isUnavailable({ ...base, kind: 'rejected' })).toBe(false)
  })
})
