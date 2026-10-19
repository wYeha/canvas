/**
 * Чистый план синхронизации: по локальному индексу, списку и журналу удалений с сервера и состоянию синхронизации
 * решает, что отправить, скачать и удалить. Конфликт (изменились обе стороны) — побеждает более свежий `updatedAt`.
 */
import type { DocumentMeta } from './documents.types'
import type { SyncRecord } from './documents-sync-state'

/** Шаги синхронизации. */
export interface SyncPlan {
  /** Отправить локальную версию на сервер. */
  push: string[]
  /** Скачать версию с сервера. */
  pull: string[]
  /** Удалить на сервере (удалён локально). */
  deleteRemote: string[]
  /** Удалить локально (удалён на другом устройстве). */
  deleteLocal: string[]
  /** Забыть отметку «удалён локально»: на сервере документа уже нет. */
  forgetDeleted: string[]
  /** Отметить версию как совпадающую без передачи (у обеих сторон одинаковый `updatedAt`). */
  markSynced: Record<string, string>
}

/** Пустой план. */
function emptyPlan(): SyncPlan {
  return { push: [], pull: [], deleteRemote: [], deleteLocal: [], forgetDeleted: [], markSynced: {} }
}

/** Время в мс; нечитаемое — самое старое. */
function timeOf(updatedAt: string): number {
  const time = Date.parse(updatedAt)
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

/** Документ есть на обеих сторонах: равны — совпадают; изменилась одна сторона — она и побеждает; иначе свежее. */
function planBoth(plan: SyncPlan, local: DocumentMeta, server: DocumentMeta, synced: string | undefined): void {
  if (local.updatedAt === server.updatedAt) {
    if (synced !== local.updatedAt) plan.markSynced[local.id] = local.updatedAt
    return
  }
  if (synced === server.updatedAt) plan.push.push(local.id)
  else if (synced === local.updatedAt) plan.pull.push(local.id)
  else if (timeOf(local.updatedAt) >= timeOf(server.updatedAt)) plan.push.push(local.id)
  else plan.pull.push(local.id)
}

/**
 * Документ только локально: удалён на сервере (есть в журнале) и с синхронизации не менялся — удалить и здесь;
 * иначе (новый, созданный до синхронизации, изменённый после удаления в другом месте или пропавший с сервера без
 * записи в журнале — новая или восстановленная база) — отправить. Без записи в журнале локальная копия не удаляется никогда.
 */
function planLocalOnly(plan: SyncPlan, local: DocumentMeta, synced: string | undefined, remoteDeleted: boolean): void {
  if (remoteDeleted && synced === local.updatedAt) plan.deleteLocal.push(local.id)
  else plan.push.push(local.id)
}

/** Что известно о сервере: список документов и журнал удалённых. */
export interface ServerSnapshot {
  documents: readonly DocumentMeta[]
  deletedIds: readonly string[]
}

/** Строит план; порядок шагов внутри списков — как в индексах (стабильный для тестов). */
export function planSync(local: readonly DocumentMeta[], snapshot: ServerSnapshot, record: SyncRecord): SyncPlan {
  const plan = emptyPlan()
  const server = snapshot.documents
  const remoteDeleted = new Set(snapshot.deletedIds)
  const deleted = new Set(record.deleted)
  const serverById = new Map(server.map((meta) => [meta.id, meta]))
  const localIds = new Set(local.map((meta) => meta.id))
  for (const id of deleted) {
    if (serverById.has(id)) plan.deleteRemote.push(id)
    else plan.forgetDeleted.push(id)
  }
  for (const meta of local) {
    if (deleted.has(meta.id)) continue
    const remote = serverById.get(meta.id)
    const synced = record.synced[meta.id]
    if (remote) planBoth(plan, meta, remote, synced)
    else planLocalOnly(plan, meta, synced, remoteDeleted.has(meta.id))
  }
  for (const meta of server) {
    if (!localIds.has(meta.id) && !deleted.has(meta.id)) plan.pull.push(meta.id)
  }
  return plan
}

/** В плане нет ни одного шага. */
export function isPlanEmpty(plan: SyncPlan): boolean {
  return (
    plan.push.length === 0 &&
    plan.pull.length === 0 &&
    plan.deleteRemote.length === 0 &&
    plan.deleteLocal.length === 0 &&
    plan.forgetDeleted.length === 0 &&
    Object.keys(plan.markSynced).length === 0
  )
}
