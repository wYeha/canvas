/**
 * Тонкий адаптер документов к localStorage: индекс, документ по ключу на id, id текущего документа.
 * Всё читается через parseDocument; битые записи пропускаются с предупреждением в консоли и не роняют приложение.
 */
import { parseDocument, type LayoutDocument } from '@shared'
import {
  CURRENT_DOCUMENT_STORAGE_KEY,
  DOCUMENT_STORAGE_PREFIX,
  DOCUMENTS_INDEX_STORAGE_KEY,
} from '@/scripts/globals/constants'
import { getStorageItem, removeStorageItem, setStorageItem } from '@/scripts/globals/storage'
import { parseIndex, serializeIndex } from './documents-index'
import type { DocumentMeta } from './documents.types'

/** Ключ localStorage документа по id. */
export function documentKey(id: string): string {
  return DOCUMENT_STORAGE_PREFIX + id
}

/** Читает индекс документов; нечитаемый индекс или записи в нём пропускаются с предупреждением. */
export function readIndex(): DocumentMeta[] {
  const { metas, skipped, broken } = parseIndex(getStorageItem(DOCUMENTS_INDEX_STORAGE_KEY))
  if (broken) console.warn('Индекс документов повреждён и пропущен')
  if (skipped > 0) console.warn(`Пропущено повреждённых записей индекса документов: ${String(skipped)}`)
  return metas
}

/** Записывает индекс; `false`, если запись не удалась (например, переполнена квота). */
export function writeIndex(metas: readonly DocumentMeta[]): boolean {
  return setStorageItem(DOCUMENTS_INDEX_STORAGE_KEY, serializeIndex(metas))
}

/** Читает документ по id и проверяет схемой; `null`, если его нет или он повреждён (с предупреждением). */
export function readDocument(id: string): LayoutDocument | null {
  const raw = getStorageItem(documentKey(id))
  if (raw === null) {
    console.warn(`Документ «${id}» не найден в хранилище`)
    return null
  }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    console.warn(`Документ «${id}» повреждён: не JSON`)
    return null
  }
  const result = parseDocument(data)
  if (result.ok) return result.document
  console.warn(`Документ «${id}» пропущен: ${result.error}`)
  return null
}

/** Записывает документ под его id; `false`, если запись не удалась. */
export function writeDocument(doc: LayoutDocument): boolean {
  return setStorageItem(documentKey(doc.id), JSON.stringify(doc))
}

/** Удаляет документ из хранилища; `false`, если операция не прошла. */
export function removeDocument(id: string): boolean {
  return removeStorageItem(documentKey(id))
}

/** Читает id текущего документа; `null`, если не задан. */
export function readCurrentId(): string | null {
  return getStorageItem(CURRENT_DOCUMENT_STORAGE_KEY)
}

/** Запоминает id текущего документа; `false`, если запись не удалась. */
export function writeCurrentId(id: string): boolean {
  return setStorageItem(CURRENT_DOCUMENT_STORAGE_KEY, id)
}
