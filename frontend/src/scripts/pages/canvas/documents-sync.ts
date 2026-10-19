/**
 * Фоновая синхронизация документов с сервером: локальный индекс и `localStorage` остаются основным хранилищем
 * (работают офлайн), сервер сводится с ними по плану `planSync`. Один проход за раз; сбой — повтор позже.
 */
import { ref, type Ref } from 'vue'
import type { LayoutDocument } from '@shared'
import type { ApiFailure } from '@/scripts/globals/api'
import {
  deleteRemoteDocument,
  fetchDeletedDocumentIds,
  fetchDocument,
  fetchDocumentList,
  putDocument,
} from './documents-api'
import { SYNC_DELAY_MS, SYNC_RETRY_MS } from './documents-constants'
import { removeMeta, toMeta, upsertMeta } from './documents-index'
import { readDocument, readIndex, removeDocument, writeDocument, writeIndex } from './documents-storage'
import { planSync, type ServerSnapshot, type SyncPlan } from './documents-sync-plan'
import { updateSyncRecord, withDeleted, withoutDocument, withSynced, readSyncRecord } from './documents-sync-state'
import type { DocumentMeta } from './documents.types'

/** Состояние синхронизации: выключена (нет сессии или демо), идёт или ждёт, всё совпадает, сбой (повтор позже). */
export type SyncState = 'off' | 'syncing' | 'synced' | 'failed'

/** Что изменилось локально по итогам прохода: скачанные и удалённые документы. */
export interface RemoteChanges {
  pulled: string[]
  removed: string[]
}

/** Итог шага или прохода: `partial` — сервер отклонил отдельные документы, остальные синхронизированы. */
type StepOutcome = 'ok' | 'partial' | 'unauthorized' | 'failed'

/**
 * Реакция на ошибку запроса по одному документу: `abort` — прервать проход (сеть, 5xx, истёкшая сессия),
 * `skip` — сервер отклонил именно этот документ (слишком большой, не той схемы): пропустить и идти дальше,
 * иначе один такой документ навсегда остановил бы синхронизацию остальных.
 */
type FailureReaction = { kind: 'abort'; outcome: StepOutcome } | { kind: 'skip' }

/** Зависимости: можно ли синхронизировать сейчас, реакция на изменения с сервера и на истёкшую сессию. */
export interface DocumentsSyncDeps {
  isEnabled: () => boolean
  /** Можно ли отправлять документ (нетронутую заглушку нового устройства — нет). */
  isPushable: (id: string) => boolean
  onRemoteChanges: (changes: RemoteChanges) => void
  onUnauthorized: () => void
}

/** Управление синхронизацией. */
export interface DocumentsSync {
  state: Ref<SyncState>
  /** Синхронизировать после паузы: `change` — после локальной правки (статус сразу «сохраняется»), `refresh` — проверить сервер. */
  request: (reason: 'change' | 'refresh') => void
  /** Синхронизировать сейчас. */
  runNow: () => Promise<void>
  /** Документ удалён локально: удалить его и на сервере. */
  markDeleted: (id: string) => void
  /** Остановить таймеры (уход со страницы); идущий проход завершится без повтора. */
  stop: () => void
}

/** Итог по ошибке API: истёкшая сессия отдельно, остальное — сбой с повтором. */
function outcomeOf(error: ApiFailure): StepOutcome {
  return error.kind === 'unauthorized' ? 'unauthorized' : 'failed'
}

/** Реакция на ошибку по документу: отклонённый сервером документ пропускается, остальное прерывает проход. */
function reactionTo(error: ApiFailure, id: string): FailureReaction {
  if (error.kind !== 'rejected' && error.kind !== 'invalid-response')
    return { kind: 'abort', outcome: outcomeOf(error) }
  console.warn(`Документ «${id}» не синхронизирован: сервер отклонил его (${error.message ?? error.kind})`)
  return { kind: 'skip' }
}

/** Записывает скачанный документ и его запись в индексе; `false` — не хватило места. */
function storePulled(doc: LayoutDocument): boolean {
  return writeDocument(doc) && writeIndex(upsertMeta(readIndex(), toMeta(doc)))
}

/** Локальная версия не менялась с момента плана (иначе пользователь успел её править — шаг откладывается). */
function unchangedSincePlan(id: string, planned: ReadonlyMap<string, DocumentMeta>): boolean {
  return readIndex().find((meta) => meta.id === id)?.updatedAt === planned.get(id)?.updatedAt
}

/** Удаления на сервере и отметки без передачи данных. */
async function applyRemoteDeletes(plan: SyncPlan): Promise<StepOutcome> {
  for (const id of plan.forgetDeleted) updateSyncRecord((record) => withoutDocument(record, id))
  for (const [id, updatedAt] of Object.entries(plan.markSynced)) {
    updateSyncRecord((record) => withSynced(record, id, updatedAt))
  }
  for (const id of plan.deleteRemote) {
    const result = await deleteRemoteDocument(id)
    if (!result.ok) return outcomeOf(result.error)
    updateSyncRecord((record) => withoutDocument(record, id))
  }
  return 'ok'
}

/**
 * Отправляет локальные версии; отметка — по `updatedAt` отправленной (более свежая уйдёт следующим проходом).
 * Отклонённый документ пропускается, проход считается неполным (`partial`).
 */
async function applyPushes(plan: SyncPlan, isPushable: (id: string) => boolean): Promise<StepOutcome> {
  let outcome: StepOutcome = 'ok'
  for (const id of plan.push) {
    const doc = isPushable(id) ? readDocument(id) : null
    if (doc === null) continue
    const result = await putDocument(doc)
    if (result.ok) {
      updateSyncRecord((record) => withSynced(record, id, doc.updatedAt))
      continue
    }
    const reaction = reactionTo(result.error, id)
    if (reaction.kind === 'abort') return reaction.outcome
    outcome = 'partial'
  }
  return outcome
}

/** Скачивает версии с сервера и удаляет локально удалённые в другом месте; правленные за время прохода не трогает. */
async function applyPulls(
  plan: SyncPlan,
  planned: ReadonlyMap<string, DocumentMeta>,
  changes: RemoteChanges,
): Promise<StepOutcome> {
  let outcome: StepOutcome = 'ok'
  for (const id of plan.pull) {
    if (planned.has(id) && !unchangedSincePlan(id, planned)) continue
    const result = await fetchDocument(id)
    if (!result.ok) {
      const reaction = reactionTo(result.error, id)
      if (reaction.kind === 'abort') return reaction.outcome
      outcome = 'partial'
      continue
    }
    if (!storePulled(result.data)) {
      console.warn(`Документ «${id}» с сервера не сохранён: не хватает места в браузере`)
      outcome = 'partial'
      continue
    }
    updateSyncRecord((record) => withSynced(record, id, result.data.updatedAt))
    changes.pulled.push(id)
  }
  for (const id of plan.deleteLocal) {
    if (!unchangedSincePlan(id, planned)) continue
    removeDocument(id)
    writeIndex(removeMeta(readIndex(), id))
    updateSyncRecord((record) => withoutDocument(record, id))
    changes.removed.push(id)
  }
  return outcome
}

/** Снимок сервера: список документов и журнал удалений; ошибка — итог прохода. */
async function fetchSnapshot(): Promise<ServerSnapshot | StepOutcome> {
  const list = await fetchDocumentList()
  if (!list.ok) return outcomeOf(list.error)
  const deleted = await fetchDeletedDocumentIds()
  if (!deleted.ok) return outcomeOf(deleted.error)
  return { documents: list.data, deletedIds: deleted.data }
}

/** Худший из итогов шагов: истёкшая сессия, затем сбой, затем неполный проход, затем успех. */
function worst(...outcomes: StepOutcome[]): StepOutcome {
  const order: StepOutcome[] = ['unauthorized', 'failed', 'partial']
  return order.find((outcome) => outcomes.includes(outcome)) ?? 'ok'
}

/** Один проход: снимок сервера, план, шаги по порядку (удаления, отправка, скачивание). */
async function syncOnce(changes: RemoteChanges, deps: DocumentsSyncDeps): Promise<StepOutcome> {
  const snapshot = await fetchSnapshot()
  if (typeof snapshot === 'string') return snapshot
  const local = readIndex()
  const planned = new Map(local.map((meta) => [meta.id, meta]))
  const plan = planSync(local, snapshot, readSyncRecord())
  const deletes = await applyRemoteDeletes(plan)
  if (deletes !== 'ok') return deletes
  const pushes = await applyPushes(plan, deps.isPushable)
  if (pushes === 'unauthorized' || pushes === 'failed') return pushes
  return worst(pushes, await applyPulls(plan, planned, changes))
}

/** Создаёт синхронизацию. Таймеры: пауза перед проходом и повтор после сбоя. */
export function createDocumentsSync(deps: DocumentsSyncDeps): DocumentsSync {
  const state = ref<SyncState>('off')
  let delayTimer: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let rerun = false
  let stopped = false

  /** Снимает таймеры. */
  function clearTimers(): void {
    if (delayTimer !== null) clearTimeout(delayTimer)
    if (retryTimer !== null) clearTimeout(retryTimer)
    delayTimer = null
    retryTimer = null
  }

  /** Итог прохода: состояние, реакция на сессию, повтор после сбоя. */
  function finish(outcome: StepOutcome, changes: RemoteChanges): void {
    if (changes.pulled.length > 0 || changes.removed.length > 0) deps.onRemoteChanges(changes)
    if (outcome === 'unauthorized') {
      state.value = 'off'
      deps.onUnauthorized()
      return
    }
    state.value = outcome === 'ok' ? 'synced' : 'failed'
    if (outcome !== 'ok') retryTimer = setTimeout(() => void runNow(), SYNC_RETRY_MS)
  }

  /** Остановлена ли синхронизация (флаг меняется, пока идёт проход, поэтому читается функцией). */
  function isStopped(): boolean {
    return stopped
  }

  /** Один проход с перехватом непредвиденных ошибок. */
  async function runPass(changes: RemoteChanges): Promise<StepOutcome> {
    running = true
    try {
      return await syncOnce(changes, deps)
    } catch (error) {
      console.error('Синхронизация документов прервана', error)
      return 'failed'
    } finally {
      running = false
    }
  }

  /** Выполняет проход; во время прохода новый запрос ставит ещё один проход сразу после. */
  async function runNow(): Promise<void> {
    clearTimers()
    stopped = false
    if (!deps.isEnabled()) {
      state.value = 'off'
      return
    }
    if (running) {
      rerun = true
      return
    }
    const changes: RemoteChanges = { pulled: [], removed: [] }
    const outcome = await runPass(changes)
    if (isStopped()) return
    // Истёкшая сессия важнее повтора: повторный проход получил бы тот же 401
    const again = rerun
    rerun = false
    if (again && outcome !== 'unauthorized') {
      if (changes.pulled.length > 0 || changes.removed.length > 0) deps.onRemoteChanges(changes)
      return runNow()
    }
    finish(outcome, changes)
  }

  /** Ставит проход после паузы; локальная правка сразу показывает «сохраняется». */
  function request(reason: 'change' | 'refresh'): void {
    if (!deps.isEnabled()) {
      state.value = 'off'
      return
    }
    if (reason === 'change') state.value = 'syncing'
    if (delayTimer !== null) clearTimeout(delayTimer)
    delayTimer = setTimeout(() => void runNow(), SYNC_DELAY_MS)
  }

  /** Запоминает локальное удаление и ставит проход. */
  function markDeleted(id: string): void {
    updateSyncRecord((record) => withDeleted(record, id))
    request('change')
  }

  /** Останавливает таймеры; результат идущего прохода не приведёт к повтору. */
  function stop(): void {
    clearTimers()
    stopped = true
  }

  return { state, request, runNow, markDeleted, stop }
}
