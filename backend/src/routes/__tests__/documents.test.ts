/** Тесты API документов через `inject`: CRUD, проверка тела и параметров, единый формат ошибок, лимит тела. */

import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { documentFixture, memoryDatabase } from '@/__tests__/fixtures'
import { BODY_LIMIT_BYTES, ERROR_CODES, MAX_DOCUMENT_ID_LENGTH } from '@/constants'
import { buildServer } from '@/server'

describe('API документов', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildServer({ logLevel: 'silent' }, { db: memoryDatabase() })
  })

  afterEach(async () => {
    await app.close()
  })

  it('создаёт документ, отдаёт его и мету в списке', async () => {
    const doc = documentFixture({}, 2)
    const created = await app.inject({ method: 'POST', url: '/api/documents', payload: doc })
    expect(created.statusCode).toBe(201)
    expect(created.json()).toEqual(doc)

    const read = await app.inject({ method: 'GET', url: '/api/documents/doc-1' })
    expect(read.statusCode).toBe(200)
    expect(read.json()).toEqual(doc)

    const list = await app.inject({ method: 'GET', url: '/api/documents' })
    expect(list.json()).toEqual([{ id: 'doc-1', name: 'Дашборд', updatedAt: doc.updatedAt, rootCount: 2 }])
  })

  it('POST с существующим id — 409', async () => {
    const doc = documentFixture()
    await app.inject({ method: 'POST', url: '/api/documents', payload: doc })
    const again = await app.inject({ method: 'POST', url: '/api/documents', payload: doc })
    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({ error: { code: ERROR_CODES.documentExists } })
  })

  it('PUT создаёт (201) и заменяет (200)', async () => {
    const doc = documentFixture()
    const created = await app.inject({ method: 'PUT', url: '/api/documents/doc-1', payload: doc })
    expect(created.statusCode).toBe(201)
    const renamed = { ...doc, name: 'Новое' }
    const updated = await app.inject({ method: 'PUT', url: '/api/documents/doc-1', payload: renamed })
    expect(updated.statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/documents/doc-1' })).json()).toEqual(renamed)
  })

  it('PUT с другим id в теле — 400 ID_MISMATCH, документ не создаётся', async () => {
    const response = await app.inject({ method: 'PUT', url: '/api/documents/other', payload: documentFixture() })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: { code: ERROR_CODES.idMismatch } })
    expect((await app.inject({ method: 'GET', url: '/api/documents' })).json()).toEqual([])
  })

  it('невалидный документ — 400 VALIDATION_ERROR с понятным текстом', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/documents',
      payload: { ...documentFixture(), name: 42 },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      error: { code: ERROR_CODES.validation, message: expect.stringContaining('name') },
    })
  })

  it('чтение и удаление отсутствующего — 404 DOCUMENT_NOT_FOUND', async () => {
    for (const method of ['GET', 'DELETE'] as const) {
      const response = await app.inject({ method, url: '/api/documents/nope' })
      expect(response.statusCode).toBe(404)
      expect(response.json()).toMatchObject({ error: { code: ERROR_CODES.documentNotFound } })
    }
  })

  it('удаляет документ: 204, затем 404', async () => {
    await app.inject({ method: 'PUT', url: '/api/documents/doc-1', payload: documentFixture() })
    expect((await app.inject({ method: 'DELETE', url: '/api/documents/doc-1' })).statusCode).toBe(204)
    expect((await app.inject({ method: 'GET', url: '/api/documents/doc-1' })).statusCode).toBe(404)
  })

  it('слишком длинный id в адресе или в новом документе — 400', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/documents/${'x'.repeat(MAX_DOCUMENT_ID_LENGTH + 1)}`,
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: { code: ERROR_CODES.validation } })
    const longId = documentFixture({ id: 'x'.repeat(MAX_DOCUMENT_ID_LENGTH + 1) })
    expect((await app.inject({ method: 'POST', url: '/api/documents', payload: longId })).statusCode).toBe(400)
  })

  it('тело больше 1 МБ — 413 в едином формате', async () => {
    const doc = documentFixture({ name: 'x'.repeat(BODY_LIMIT_BYTES) })
    const response = await app.inject({ method: 'PUT', url: '/api/documents/doc-1', payload: doc })
    expect(response.statusCode).toBe(413)
    expect(response.json()).toMatchObject({ error: { code: expect.any(String), message: expect.any(String) } })
  })
})
