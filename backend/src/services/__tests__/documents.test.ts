/** Тесты сервиса документов на базе в памяти: создание, сохранение, чтение, список, удаление, испорченные данные. */

import type { Database } from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { documentFixture, memoryDatabase } from '@/__tests__/fixtures'
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDeletedDocumentIds,
  listDocuments,
  saveDocument,
} from '@/services/documents'

describe('сервис документов', () => {
  let db: Database

  beforeEach(() => {
    db = memoryDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('создаёт документ и читает его обратно без изменений', () => {
    const doc = documentFixture({}, 2)
    expect(createDocument(db, doc)).toBe(true)
    expect(getDocument(db, doc.id)).toEqual(doc)
  })

  it('повторное создание с тем же id не меняет документ', () => {
    const doc = documentFixture()
    createDocument(db, doc)
    expect(createDocument(db, { ...doc, name: 'Другой' })).toBe(false)
    expect(getDocument(db, doc.id)?.name).toBe('Дашборд')
  })

  it('сохранение создаёт отсутствующий документ и заменяет существующий', () => {
    const doc = documentFixture()
    expect(saveDocument(db, doc)).toBe('created')
    const renamed = { ...doc, name: 'Новое имя', updatedAt: '2026-02-01T00:00:00.000Z' }
    expect(saveDocument(db, renamed)).toBe('updated')
    expect(getDocument(db, doc.id)).toEqual(renamed)
  })

  it('чтение отсутствующего документа — null', () => {
    expect(getDocument(db, 'nope')).toBeNull()
  })

  it('список — мета документов, свежие первыми', () => {
    saveDocument(db, documentFixture({ id: 'old', name: 'Старый', updatedAt: '2026-01-01T00:00:00.000Z' }, 0))
    saveDocument(db, documentFixture({ id: 'new', name: 'Новый', updatedAt: '2026-03-01T00:00:00.000Z' }, 3))
    expect(listDocuments(db)).toEqual([
      { id: 'new', name: 'Новый', updatedAt: '2026-03-01T00:00:00.000Z', rootCount: 3 },
      { id: 'old', name: 'Старый', updatedAt: '2026-01-01T00:00:00.000Z', rootCount: 0 },
    ])
  })

  it('удаление: true для существующего, false для отсутствующего', () => {
    saveDocument(db, documentFixture())
    expect(deleteDocument(db, 'doc-1')).toBe(true)
    expect(deleteDocument(db, 'doc-1')).toBe(false)
    expect(listDocuments(db)).toEqual([])
  })

  it('удаление пишет журнал; повторное сохранение того же id убирает запись из журнала', () => {
    saveDocument(db, documentFixture())
    expect(listDeletedDocumentIds(db)).toEqual([])
    deleteDocument(db, 'doc-1')
    expect(listDeletedDocumentIds(db)).toEqual(['doc-1'])
    saveDocument(db, documentFixture())
    expect(listDeletedDocumentIds(db)).toEqual([])
    deleteDocument(db, 'doc-1')
    createDocument(db, documentFixture())
    expect(listDeletedDocumentIds(db)).toEqual([])
  })

  it('удаление отсутствующего документа журнал не пишет', () => {
    deleteDocument(db, 'nope')
    expect(listDeletedDocumentIds(db)).toEqual([])
  })

  it('испорченные данные в базе — исключение при чтении и пропуск в списке', () => {
    saveDocument(db, documentFixture())
    db.prepare("UPDATE documents SET data = '{', updated_at = 'не дата' WHERE id = 'doc-1'").run()
    expect(() => getDocument(db, 'doc-1')).toThrow(/не JSON/)
    expect(listDocuments(db)).toEqual([])
  })

  it('id с кавычками и SQL не ломают запрос (параметры)', () => {
    const doc = documentFixture({ id: "x'; DROP TABLE documents; --" })
    saveDocument(db, doc)
    expect(getDocument(db, doc.id)?.id).toBe(doc.id)
  })
})
