/**
 * Состояние синхронизации с сервером в localStorage: версии документов, на которых стороны последний раз совпали,
 * и удалённые локально документы, которые ещё нужно удалить на сервере. Битая запись читается как пустая.
 */
import { SYNC_STATE_STORAGE_KEY } from '@/scripts/globals/constants'
import { getStorageItem, setStorageItem } from '@/scripts/globals/storage'

/** Состояние синхронизации. */
export interface SyncRecord {
  /** id → `updatedAt` версии, одинаковой локально и на сервере после последней синхронизации. */
  synced: Record<string, string>
  /** id документов, удалённых локально и ещё не удалённых на сервере. */
  deleted: string[]
}

/** Пустое состояние: ничего не синхронизировано. */
export function emptySyncRecord(): SyncRecord {
  return { synced: {}, deleted: [] }
}

/** Только строковые пары id → дата. */
function parseSynced(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [id, updatedAt] of Object.entries(value)) {
    if (id !== '' && typeof updatedAt === 'string') result[id] = updatedAt
  }
  return result
}

/** Только непустые строки без повторов. */
function parseDeleted(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id !== ''))]
}

/** Разбирает строку состояния (внешние данные: localStorage мог быть изменён вручную); нечитаемое — пустое. */
export function parseSyncRecord(raw: string | null): SyncRecord {
  if (raw === null) return emptySyncRecord()
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return emptySyncRecord()
  }
  if (typeof data !== 'object' || data === null) return emptySyncRecord()
  const record = data as Record<string, unknown>
  return { synced: parseSynced(record.synced), deleted: parseDeleted(record.deleted) }
}

/** Читает состояние синхронизации. */
export function readSyncRecord(): SyncRecord {
  return parseSyncRecord(getStorageItem(SYNC_STATE_STORAGE_KEY))
}

/** Записывает состояние синхронизации; `false`, если запись не удалась. */
export function writeSyncRecord(record: SyncRecord): boolean {
  return setStorageItem(SYNC_STATE_STORAGE_KEY, JSON.stringify(record))
}

/** Меняет состояние на свежем чтении и записывает (другая вкладка могла его изменить). */
export function updateSyncRecord(change: (record: SyncRecord) => SyncRecord): boolean {
  return writeSyncRecord(change(readSyncRecord()))
}

/** Отмечает версию документа как совпадающую на обеих сторонах. */
export function withSynced(record: SyncRecord, id: string, updatedAt: string): SyncRecord {
  return { ...record, synced: { ...record.synced, [id]: updatedAt } }
}

/** Убирает документ из состояния целиком (удалён на обеих сторонах). */
export function withoutDocument(record: SyncRecord, id: string): SyncRecord {
  const synced = Object.fromEntries(Object.entries(record.synced).filter(([key]) => key !== id))
  return { synced, deleted: record.deleted.filter((item) => item !== id) }
}

/** Документ удалён локально: ждёт удаления на сервере. */
export function withDeleted(record: SyncRecord, id: string): SyncRecord {
  const next = withoutDocument(record, id)
  return { ...next, deleted: [...next.deleted, id] }
}
