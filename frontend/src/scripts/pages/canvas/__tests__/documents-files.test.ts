/** Тесты чистой логики файлов .json: сериализация, имя файла, размер, разбор текста, уникальное имя, подготовка импорта. */
import { describe, expect, it } from 'vitest'
import { DOCUMENT_NAME_MAX_LENGTH, IMPORT_MAX_BYTES } from '@/scripts/pages/canvas/documents-constants'
import {
  checkImportSize,
  documentFileName,
  parseImportText,
  prepareImport,
  serializeDocument,
  uniqueName,
} from '@/scripts/pages/canvas/documents-files'
import { createDocument } from '@/scripts/pages/canvas/factories'

/** Код BOM (U+FEFF), задаётся числом, чтобы не хранить невидимый символ в файле. */
const BOM = String.fromCharCode(0xfeff)

describe('serializeDocument', () => {
  it('JSON с отступом 2 и переводом строки в конце; обратно разбирается в тот же документ', () => {
    const doc = createDocument('Лендинг')
    const text = serializeDocument(doc)
    expect(text.startsWith('{\n  "schemaVersion"')).toBe(true)
    expect(text.endsWith('}\n')).toBe(true)
    expect(JSON.parse(text)).toEqual(doc)
  })
})

describe('documentFileName', () => {
  it('добавляет .layout.json и чистит недопустимые символы', () => {
    expect(documentFileName('Лендинг')).toBe('Лендинг.layout.json')
    expect(documentFileName('a/b:c')).toBe('a-b-c.layout.json')
  })

  it('пустое имя после очистки заменяется на layout', () => {
    expect(documentFileName('  ... ')).toBe('layout.layout.json')
  })
})

describe('checkImportSize', () => {
  it('границу включает: ровно лимит допустим, на байт больше — отказ с причиной', () => {
    expect(checkImportSize(IMPORT_MAX_BYTES)).toBeNull()
    expect(checkImportSize(IMPORT_MAX_BYTES + 1)).toContain('2 МБ')
  })
})

describe('parseImportText', () => {
  it('валидный документ проходит, BOM в начале снимается', () => {
    const doc = createDocument('A')
    expect(parseImportText(JSON.stringify(doc))).toEqual({ ok: true, document: doc })
    expect(parseImportText(BOM + JSON.stringify(doc)).ok).toBe(true)
  })

  it('не JSON — понятная причина', () => {
    expect(parseImportText('<html>')).toEqual({ ok: false, error: 'это не JSON' })
    expect(parseImportText('')).toEqual({ ok: false, error: 'это не JSON' })
  })

  it('JSON не по схеме — русское сообщение parseDocument', () => {
    const result = parseImportText('{"hello": 1}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Документ повреждён')
  })
})

describe('uniqueName', () => {
  it('свободное имя не меняется, занятое получает (2), (3)…', () => {
    expect(uniqueName('Лендинг', ['Другой'])).toBe('Лендинг')
    expect(uniqueName('Лендинг', ['Лендинг'])).toBe('Лендинг (2)')
    expect(uniqueName('Лендинг', ['Лендинг', 'Лендинг (2)'])).toBe('Лендинг (3)')
  })

  it('пустое имя заменяется на «Без названия»', () => {
    expect(uniqueName('  ', [])).toBe('Без названия')
  })

  it('длина с суффиксом не больше лимита', () => {
    const long = 'я'.repeat(DOCUMENT_NAME_MAX_LENGTH + 10)
    const first = uniqueName(long, [])
    expect(Array.from(first)).toHaveLength(DOCUMENT_NAME_MAX_LENGTH)
    const second = uniqueName(long, [first])
    expect(Array.from(second)).toHaveLength(DOCUMENT_NAME_MAX_LENGTH)
    expect(second.endsWith(' (2)')).toBe(true)
  })
})

describe('prepareImport', () => {
  it('новый id, уникальное имя и свежее время; остальное и исходный объект не меняются', () => {
    const doc = createDocument('Лендинг')
    const copy = structuredClone(doc)
    const now = new Date('2026-05-05T10:00:00.000Z')
    const next = prepareImport(doc, ['Лендинг'], 'new-id', now)
    expect(next).toEqual({ ...doc, id: 'new-id', name: 'Лендинг (2)', updatedAt: now.toISOString() })
    expect(doc).toEqual(copy)
  })
})
