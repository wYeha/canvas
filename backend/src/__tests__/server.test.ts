/** Тесты сервера через `inject`: проверка работоспособности и единый формат ошибок. */

import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ERROR_CODES, HTTP_STATUS_INTERNAL } from '@/constants'
import { buildTestServer } from './fixtures'

describe('сервер', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestServer()
  })

  afterEach(async () => {
    await app.close()
  })

  it('GET /api/health отвечает ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('неизвестный маршрут — 404 в едином формате', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/unknown' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: { code: ERROR_CODES.notFound, message: expect.any(String) } })
  })

  it('внутренняя ошибка отдаётся без подробностей', async () => {
    app.get('/api/boom', () => {
      throw new Error('секретная подробность')
    })
    const response = await app.inject({ method: 'GET', url: '/api/boom' })
    expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL)
    expect(response.body).not.toContain('секретная')
    expect(response.json()).toEqual({ error: { code: ERROR_CODES.internal, message: expect.any(String) } })
  })

  it('битый JSON — 400 в едином формате', async () => {
    app.post('/api/echo', () => ({ ok: true }))
    const response = await app.inject({
      method: 'POST',
      url: '/api/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{',
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: { code: expect.any(String), message: expect.any(String) } })
  })
})
