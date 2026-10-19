/** Тесты маршрутов входа: пароль, cookie сессии, проверка `me`, выход, лимит попыток. */

import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestServer, injectWithCookie, loginCookie, TEST_PASSWORD } from '@/__tests__/fixtures'
import { ERROR_CODES, LOGIN_RATE_LIMIT_MAX, SESSION_COOKIE_NAME, SESSION_COOKIE_PATH } from '@/constants'

describe('API входа', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestServer()
  })

  afterEach(async () => {
    await app.close()
  })

  /** Попытка входа с паролем. */
  function login(password: unknown) {
    return app.inject({ method: 'POST', url: '/api/auth/login', payload: { password } })
  }

  it('верный пароль — 204 и httpOnly-cookie сессии', async () => {
    const response = await login(TEST_PASSWORD)
    expect(response.statusCode).toBe(204)
    expect(response.cookies).toEqual([
      expect.objectContaining({
        name: SESSION_COOKIE_NAME,
        path: SESSION_COOKIE_PATH,
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      }),
    ])
  })

  it('неверный пароль — 401 INVALID_PASSWORD без cookie', async () => {
    const response = await login('не тот')
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ error: { code: ERROR_CODES.invalidPassword } })
    expect(response.cookies).toEqual([])
  })

  it('тело без пароля — 400', async () => {
    expect((await login('')).statusCode).toBe(400)
    expect((await login(42)).statusCode).toBe(400)
  })

  it('me: без cookie — 401, с cookie — authenticated', async () => {
    const anonymous = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(anonymous.statusCode).toBe(401)
    const cookie = await loginCookie(app)
    const me = await injectWithCookie(app, cookie, { method: 'GET', url: '/api/auth/me' })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toEqual({ authenticated: true })
  })

  it('выход удаляет сессию: та же cookie больше не работает', async () => {
    const cookie = await loginCookie(app)
    const logout = await injectWithCookie(app, cookie, { method: 'POST', url: '/api/auth/logout' })
    expect(logout.statusCode).toBe(204)
    expect(logout.cookies[0]).toMatchObject({ name: SESSION_COOKIE_NAME, value: '' })
    const after = await injectWithCookie(app, cookie, { method: 'GET', url: '/api/documents' })
    expect(after.statusCode).toBe(401)
  })

  it('health открыт без входа', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200)
  })

  it(`после ${String(LOGIN_RATE_LIMIT_MAX)} попыток — 429 RATE_LIMITED, даже с верным паролем`, async () => {
    for (let attempt = 0; attempt < LOGIN_RATE_LIMIT_MAX; attempt++) {
      expect((await login('не тот')).statusCode).toBe(401)
    }
    const blocked = await login(TEST_PASSWORD)
    expect(blocked.statusCode).toBe(429)
    expect(blocked.json()).toEqual({ error: { code: ERROR_CODES.rateLimited, message: expect.any(String) } })
  })
})
