/** Тесты адаптера документов к localStorage: чтение через parseDocument, битые записи, ошибки записи. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CURRENT_DOCUMENT_STORAGE_KEY,
  DOCUMENT_STORAGE_PREFIX,
  DOCUMENTS_INDEX_STORAGE_KEY,
} from '@/scripts/globals/constants'
import {
  documentKey,
  readCurrentId,
  readDocument,
  readIndex,
  removeDocument,
  writeCurrentId,
  writeDocument,
  writeIndex,
} from '@/scripts/pages/canvas/documents-storage'
import { createDocument } from '@/scripts/pages/canvas/factories'

let data: Map<string, string>

/** Подменяет localStorage Map-ом; `quotaExceeded` — любая запись бросает ошибку. */
function stubStorage(quotaExceeded = false): Map<string, string> {
  const map = new Map<string, string>()
  /** Читает значение. */
  const getItem = (key: string): string | null => map.get(key) ?? null
  /** Пишет значение или бросает ошибку квоты. */
  const setItem = (key: string, value: string): void => {
    if (quotaExceeded) throw new Error('QuotaExceededError')
    map.set(key, value)
  }
  /** Удаляет значение. */
  const removeItem = (key: string): void => void map.delete(key)
  vi.stubGlobal('localStorage', { getItem, setItem, removeItem })
  return map
}

beforeEach(() => {
  data = stubStorage()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('документ', () => {
  it('записывается под ключом с id и читается обратно', () => {
    const doc = createDocument('Док')
    expect(writeDocument(doc)).toBe(true)
    expect(data.has(DOCUMENT_STORAGE_PREFIX + doc.id)).toBe(true)
    expect(documentKey(doc.id)).toBe(DOCUMENT_STORAGE_PREFIX + doc.id)
    expect(readDocument(doc.id)).toEqual(doc)
  })

  it('нет записи, не JSON и не по схеме — null с предупреждением', () => {
    expect(readDocument('нет')).toBeNull()
    data.set(documentKey('a'), '{')
    expect(readDocument('a')).toBeNull()
    data.set(documentKey('b'), '{"id":"b"}')
    expect(readDocument('b')).toBeNull()
    expect(console.warn).toHaveBeenCalledTimes(3)
  })

  it('удаляется', () => {
    const doc = createDocument()
    writeDocument(doc)
    expect(removeDocument(doc.id)).toBe(true)
    expect(data.has(documentKey(doc.id))).toBe(false)
  })

  it('ошибка записи (квота) — false, а не исключение', () => {
    stubStorage(true)
    expect(writeDocument(createDocument())).toBe(false)
    expect(writeIndex([])).toBe(false)
  })
})

describe('индекс и текущий документ', () => {
  it('индекс записывается и читается, битые записи пропускаются с предупреждением', () => {
    const good = { id: 'a', name: 'А', updatedAt: '2026-01-01T00:00:00.000Z', rootCount: 1 }
    data.set(DOCUMENTS_INDEX_STORAGE_KEY, JSON.stringify([good, { id: 5 }]))
    expect(readIndex()).toEqual([good])
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(writeIndex([good])).toBe(true)
    expect(readIndex()).toEqual([good])
  })

  it('нечитаемый индекс — пустой список с предупреждением', () => {
    data.set(DOCUMENTS_INDEX_STORAGE_KEY, 'мусор')
    expect(readIndex()).toEqual([])
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  it('id текущего документа', () => {
    expect(readCurrentId()).toBeNull()
    expect(writeCurrentId('x')).toBe(true)
    expect(data.get(CURRENT_DOCUMENT_STORAGE_KEY)).toBe('x')
    expect(readCurrentId()).toBe('x')
  })
})
