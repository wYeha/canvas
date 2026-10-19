/** Тесты хранилища сессии: проверка один раз, состояния по ответам сервера, вход и выход. */
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOGIN_ERROR_MESSAGES } from '@/scripts/globals/auth-api'
import { useAuthStore } from '@/scripts/globals/auth-store'

/** Подменяет fetch очередью ответов: статус и тело (объект — JSON); `null` — сбой сети. */
function stubResponses(...responses: ({ status: number; body?: unknown } | null)[]) {
  const fetchMock = vi.fn(() => {
    const next = responses.shift()
    if (!next) return Promise.reject(new TypeError('Failed to fetch'))
    const body = next.body === undefined ? null : JSON.stringify(next.body)
    return Promise.resolve(new Response(body, { status: next.status }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('сессия проверяется один раз, параллельные вызовы ждут один запрос', async () => {
    const fetchMock = stubResponses({ status: 200, body: { authenticated: true } })
    const auth = useAuthStore()
    const [first, second] = await Promise.all([auth.ensureChecked(), auth.ensureChecked()])
    expect([first, second]).toEqual(['authenticated', 'authenticated'])
    expect(await auth.ensureChecked()).toBe('authenticated')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('401 — anonymous, сбой сети и 5xx — offline', async () => {
    stubResponses({ status: 401 })
    expect(await useAuthStore().ensureChecked()).toBe('anonymous')
    setActivePinia(createPinia())
    stubResponses(null)
    expect(await useAuthStore().ensureChecked()).toBe('offline')
    setActivePinia(createPinia())
    stubResponses({ status: 502 })
    expect(await useAuthStore().ensureChecked()).toBe('offline')
  })

  it('вход: успех — authenticated, неверный пароль — текст сервера, нет сервера — общий текст', async () => {
    const auth = useAuthStore()
    stubResponses({ status: 401, body: { error: { code: 'INVALID_PASSWORD', message: 'Неверный пароль' } } })
    expect(await auth.login('x')).toEqual({ ok: false, message: 'Неверный пароль' })
    stubResponses(null)
    expect(await auth.login('x')).toEqual({ ok: false, message: LOGIN_ERROR_MESSAGES.UNAVAILABLE })
    expect(auth.state).toBe('offline')
    stubResponses({ status: 204 })
    expect(await auth.login('x')).toEqual({ ok: true })
    expect(auth.state).toBe('authenticated')
  })

  it('выход — anonymous даже без ответа сервера', async () => {
    const auth = useAuthStore()
    stubResponses({ status: 204 })
    await auth.login('x')
    stubResponses(null)
    await auth.logout()
    expect(auth.state).toBe('anonymous')
  })
})
