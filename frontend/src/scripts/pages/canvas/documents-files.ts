/**
 * Чистая логика файлов .json: сериализация документа, имя файла, проверка размера, разбор текста импорта,
 * уникальное имя и подготовка импортируемого документа (новый id, свежее время).
 */
import { parseDocument, type LayoutDocument, type ParseDocumentResult } from '@shared'
import { DEFAULT_DOCUMENT_NAME } from './constants'
import {
  BOM_CODE,
  DOCUMENT_FILE_EXTENSION,
  DOCUMENT_FILE_FALLBACK_NAME,
  DOCUMENT_JSON_INDENT,
  DOCUMENT_NAME_MAX_LENGTH,
  IMPORT_DUPLICATE_SUFFIX_START,
  IMPORT_ERROR_NOT_JSON,
  IMPORT_ERROR_TOO_LARGE,
  IMPORT_MAX_BYTES,
} from './documents-constants'
import { sanitizeFileName } from './export/export-file'

/** Сериализует документ в JSON с отступом и переводом строки в конце (удобно для git). */
export function serializeDocument(doc: LayoutDocument): string {
  return `${JSON.stringify(doc, null, DOCUMENT_JSON_INDENT)}\n`
}

/** Имя файла `<название>.layout.json`: название проходит санитизацию, пустое → `layout`. */
export function documentFileName(name: string): string {
  const safe = sanitizeFileName(name)
  return `${safe === '' ? DOCUMENT_FILE_FALLBACK_NAME : safe}${DOCUMENT_FILE_EXTENSION}`
}

/** Проверяет размер файла; возвращает причину отказа или `null`, если размер допустим. */
export function checkImportSize(bytes: number): string | null {
  return bytes > IMPORT_MAX_BYTES ? IMPORT_ERROR_TOO_LARGE : null
}

/** Разбирает текст файла: снимает BOM, JSON.parse, затем схема документа; ошибка — русским текстом. */
export function parseImportText(text: string): ParseDocumentResult {
  const body = text.charCodeAt(0) === BOM_CODE ? text.slice(1) : text
  let data: unknown
  try {
    data = JSON.parse(body)
  } catch {
    return { ok: false, error: IMPORT_ERROR_NOT_JSON }
  }
  return parseDocument(data)
}

/** Имя без совпадений с `taken`: при совпадении добавляется « (2)», « (3)»…; общая длина не больше лимита. */
export function uniqueName(name: string, taken: readonly string[]): string {
  const base = name.trim() === '' ? DEFAULT_DOCUMENT_NAME : name.trim()
  const used = new Set(taken)
  let candidate = Array.from(base).slice(0, DOCUMENT_NAME_MAX_LENGTH).join('')
  for (let n = IMPORT_DUPLICATE_SUFFIX_START; used.has(candidate); n++) {
    const suffix = ` (${String(n)})`
    const room = DOCUMENT_NAME_MAX_LENGTH - suffix.length
    candidate = `${Array.from(base).slice(0, room).join('')}${suffix}`
  }
  return candidate
}

/** Готовит импортируемый документ к добавлению: новый id (чтобы не затереть существующий), уникальное имя, свежее время. */
export function prepareImport(
  doc: LayoutDocument,
  takenNames: readonly string[],
  newId: string,
  now: Date,
): LayoutDocument {
  return { ...doc, id: newId, name: uniqueName(doc.name, takenNames), updatedAt: now.toISOString() }
}
