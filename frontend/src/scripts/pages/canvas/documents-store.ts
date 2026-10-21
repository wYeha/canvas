/**
 * Pinia-хранилище документов: список в localStorage, текущий документ, автосохранение с задержкой,
 * создание, переключение, переименование и удаление, фоновая синхронизация с сервером (при действительной сессии).
 * Демо-документ временный: не сохраняется, в список не попадает и не синхронизируется.
 */
import { computed, ref, toRaw, watch } from 'vue'
import { defineStore } from 'pinia'
import type { LayoutDocument } from '@shared'
import { AUTOSAVE_DELAY_MS, IMPORT_ERROR_FLUSH, IMPORT_ERROR_OPEN, IMPORT_ERROR_SAVE } from './documents-constants'
import { prepareImport, truncateName } from './documents-files'
import { pickDocumentId, removeMeta, sortMetas, toMeta, upsertMeta } from './documents-index'
import {
  hasStoredDocument,
  readCurrentId,
  readDocument,
  readIndex,
  removeDocument,
  writeCurrentId,
  writeDocument,
  writeIndex,
} from './documents-storage'
import type { DocumentMeta, SaveStatus } from './documents.types'
import { isAutosaveEnabled } from './save-status'
import { createDemoDocument } from './demo-document'
import { createDocument } from './factories'
import { useLayoutStore } from './layout-store'
import { useTextDraftStore } from './text-draft-store'
import { createId } from '@/scripts/globals/id'
import { useAuthStore } from '@/scripts/globals/auth-store'
import { createDocumentsSync, type RemoteChanges } from './documents-sync'

/** Результат добавления документа из файла: успех или причина отказа для тоста. */
export type ImportResult = { ok: true } | { ok: false; error: string }

/** Параметры запуска: открыть временный демо-документ вместо сохранённых. */
export interface DocumentsInitOptions {
  demo: boolean
}

export const useDocumentsStore = defineStore('documents', () => {
  const layout = useLayoutStore()
  const drafts = useTextDraftStore()
  const auth = useAuthStore()
  /** Индекс сохранённых документов (без живой записи текущего: см. `entries`). */
  const metas = ref<DocumentMeta[]>([])
  /** Id текущего сохраняемого документа; `null` в демо и до `init`. */
  const currentId = ref<string | null>(null)
  /** Статус сохранения для хедера. */
  const status = ref<SaveStatus>('saved')
  /** Счётчик загрузок документа в редактор: по нему страница возвращает камеру. */
  const loadSeq = ref(0)

  /** Идёт загрузка в layout-store: смену документа не принимаем за правку. */
  let loading = false
  /** Объект документа, совпадающий с сохранённым; правкой считается любая замена объекта. */
  let cleanDocument: LayoutDocument | null = null
  /** Таймер отложенного сохранения. */
  let timer: ReturnType<typeof setTimeout> | null = null
  /**
   * Пустой документ, созданный при запуске, потому что в браузере не было ни одного (новое устройство).
   * Пока его не правили, он заглушка: если с сервера придут документы, он удаляется (иначе копились бы пустые дубли).
   */
  let placeholder: LayoutDocument | null = null

  /** Работа в демо-режиме: сохранение выключено. */
  const isDemo = computed(() => status.value === 'demo')

  /** Синхронизация включена: есть действительная сессия и это не демо. */
  function isSyncEnabled(): boolean {
    return status.value !== 'demo' && auth.state === 'authenticated'
  }

  /** Сервер ответил «нужно войти»: сессия истекла, страница уведёт на вход. */
  function onSyncUnauthorized(): void {
    auth.markAnonymous()
  }

  /**
   * Документ можно отправлять на сервер. Нетронутую заглушку — нет: иначе другие устройства успели бы скачать пустой
   * «Без названия» до того, как он заменится документами с сервера (сравнение по `updatedAt` — любая правка его меняет).
   */
  function isPushable(id: string): boolean {
    if (placeholder?.id !== id) return true
    return entries.value.find((meta) => meta.id === id)?.updatedAt !== placeholder.updatedAt
  }

  const sync = createDocumentsSync({
    isEnabled: isSyncEnabled,
    isPushable,
    onRemoteChanges: applyRemoteChanges,
    onUnauthorized: onSyncUnauthorized,
  })
  /** Состояние синхронизации с сервером (для статуса в хедере). */
  const syncState = sync.state

  /** Список для меню: сохранённые документы, у текущего — живая запись из редактора; свежие первыми. */
  const entries = computed<DocumentMeta[]>(() => {
    if (currentId.value === null) return sortMetas(metas.value)
    return upsertMeta(metas.value, toMeta(layout.document))
  })

  /** Отменяет отложенное сохранение. */
  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  /**
   * Применяет изменение к свежему индексу из хранилища (в другой вкладке он мог измениться) и записывает его:
   * так чужие документы не затираются содержимым из памяти. Ошибка записи отражается в статусе.
   */
  function persistIndex(change: (current: DocumentMeta[]) => DocumentMeta[]): boolean {
    const next = change(readIndex())
    metas.value = next
    const ok = writeIndex(next)
    if (!ok) status.value = 'error'
    else sync.request('change')
    return ok
  }

  /** Перечитывает индекс из хранилища (событие `storage` из другой вкладки). В демо списка нет. */
  function refreshIndex(): void {
    if (status.value === 'demo') return
    metas.value = readIndex()
  }

  /** Сохраняет текущий документ и его запись в индексе; обновляет статус. */
  function persistCurrent(): boolean {
    clearTimer()
    const doc = toRaw(layout.document)
    const ok = writeDocument(doc) && persistIndex((current) => upsertMeta(current, toMeta(doc)))
    status.value = ok ? 'saved' : 'error'
    if (ok) cleanDocument = doc
    return ok
  }

  /** Планирует сохранение через `AUTOSAVE_DELAY_MS` после последней правки (debounce). */
  function scheduleSave(): void {
    status.value = 'saving'
    clearTimer()
    timer = setTimeout(persistCurrent, AUTOSAVE_DELAY_MS)
  }

  // Sync: каждая замена документа видна сразу, поэтому ни одна правка не теряется между тиками
  watch(
    () => layout.document,
    (doc) => {
      if (loading || !isAutosaveEnabled(status.value) || currentId.value === null) return
      if (toRaw(doc) === cleanDocument) return
      scheduleSave()
    },
    { flush: 'sync' },
  )

  /**
   * Немедленно дописывает отложенное сохранение; `false`, если запись не удалась (переключаться нельзя: потеряем правки).
   * Сначала в документ попадает незаписанный ввод полей «Свойств» (смена документа, уход со страницы, выход).
   */
  function flush(): boolean {
    drafts.flushAll()
    if (!isAutosaveEnabled(status.value) || currentId.value === null) return true
    if (timer === null && status.value !== 'error') return true
    return persistCurrent()
  }

  /** Открыта заглушка нового устройства, и её не правили (любая правка заменяет объект документа). */
  function isUntouchedPlaceholder(): boolean {
    return placeholder !== null && placeholder.id === currentId.value && toRaw(layout.document) === placeholder
  }

  /** В редакторе есть правки, ещё не записанные в хранилище. */
  function hasUnsavedEdits(): boolean {
    return timer !== null || toRaw(layout.document) !== cleanDocument
  }

  /**
   * Применяет изменения с сервера: перечитывает список; текущий документ, удалённый на другом устройстве, закрывается
   * (если в нём нет несохранённых правок — иначе он сохранится и уйдёт на сервер заново), скачанный заново —
   * открывается свежим только при чистом редакторе (иначе локальная правка новее и победит при следующей синхронизации).
   */
  function applyRemoteChanges(changes: RemoteChanges): void {
    if (status.value === 'demo') return
    metas.value = readIndex()
    const id = currentId.value
    if (id === null) return
    if (changes.pulled.length > 0 && isUntouchedPlaceholder()) {
      remove(id)
      return
    }
    if (changes.removed.includes(id)) {
      if (hasUnsavedEdits()) persistCurrent()
      else openAvailable(null)
      return
    }
    if (!changes.pulled.includes(id) || hasUnsavedEdits()) return
    const doc = readDocument(id)
    if (doc !== null) activate(doc)
  }

  /** Проверить сервер (возврат на вкладку, восстановление сети). */
  function refreshSync(): void {
    sync.request('refresh')
  }

  /** Остановить таймеры синхронизации (уход со страницы). */
  function stopSync(): void {
    sync.stop()
  }

  /** Загружает документ в редактор (история, выделение сбрасываются) и делает его текущим сохранённым. */
  function activate(doc: LayoutDocument): boolean {
    loading = true
    const result = layout.loadDocument(doc)
    loading = false
    if (!result.ok) {
      console.warn(result.error)
      return false
    }
    clearTimer()
    currentId.value = doc.id
    cleanDocument = toRaw(layout.document)
    status.value = 'saved'
    writeCurrentId(doc.id)
    loadSeq.value++
    return true
  }

  /**
   * Убирает нечитаемый документ только из индекса. Сырые данные `layout-canvas:document:<id>` не удаляются никогда:
   * документ мог не пройти схему из-за новой версии приложения или ручной правки, и его можно восстановить.
   */
  function hideUnreadable(id: string): void {
    if (hasStoredDocument(id)) console.warn(`Документ «${id}» убран из списка, его данные оставлены в хранилище`)
    else console.warn(`Запись индекса «${id}» без данных убрана из списка`)
    persistIndex((current) => removeMeta(current, id))
  }

  /** Создаёт новый пустой документ, делает его текущим и сразу сохраняет (чтобы он попал в список). */
  function createAndOpen(): boolean {
    return activate(createDocument()) && persistCurrent()
  }

  /** Открывает предпочитаемый или самый свежий читаемый документ, нечитаемые убирает из списка (данные не трогает); если ничего нет — создаёт пустой (заглушку, см. `placeholder`). */
  function openAvailable(preferredId: string | null): void {
    let id = pickDocumentId(metas.value, preferredId)
    while (id !== null) {
      const doc = readDocument(id)
      if (doc !== null && activate(doc)) return
      hideUnreadable(id)
      id = pickDocumentId(metas.value, null)
    }
    if (createAndOpen()) placeholder = toRaw(layout.document)
  }

  /** Запуск: демо открывается временным документом, иначе — последний текущий (или самый свежий, или новый пустой). */
  function init(options: DocumentsInitOptions): void {
    clearTimer()
    if (options.demo) {
      status.value = 'demo'
      currentId.value = null
      loading = true
      const result = layout.loadDocument(createDemoDocument())
      loading = false
      if (!result.ok) console.error(result.error)
      loadSeq.value++
      sync.stop()
      syncState.value = 'off'
      return
    }
    status.value = 'saved'
    metas.value = readIndex()
    openAvailable(readCurrentId())
    void sync.runNow()
  }

  /** Создаёт новый документ «Без названия» и открывает его; текущий перед этим сохраняется. */
  function create(): boolean {
    return flush() && createAndOpen()
  }

  /** Переключается на документ `id`, сохранив текущий; `false`, если документ нечитаем или текущий сохранить не вышло. */
  function switchTo(id: string): boolean {
    if (id === currentId.value) return true
    if (!flush()) return false
    const doc = readDocument(id)
    if (doc === null) {
      hideUnreadable(id)
      return false
    }
    return activate(doc)
  }

  /**
   * Добавляет документ из файла как новый (новый id, уникальное имя) и открывает его; текущий перед этим сохраняется.
   * Документ уже проверен схемой; редактор при открытии проверяет его ещё раз.
   */
  function importDocument(doc: LayoutDocument): ImportResult {
    if (!flush()) return { ok: false, error: IMPORT_ERROR_FLUSH }
    const names = entries.value.map((meta) => meta.name)
    const prepared = prepareImport(doc, names, createId(), new Date())
    const previousStatus = status.value
    // Сначала запись документа и индекса: при ошибке (квота) текущий документ остаётся нетронутым
    if (!writeDocument(prepared) || !persistIndex((current) => upsertMeta(current, toMeta(prepared)))) {
      rollbackImport(prepared.id, previousStatus)
      return { ok: false, error: IMPORT_ERROR_SAVE }
    }
    if (activate(prepared)) return { ok: true }
    rollbackImport(prepared.id, previousStatus)
    return { ok: false, error: IMPORT_ERROR_OPEN }
  }

  /**
   * Откатывает неудавшийся импорт: убирает только что записанный новый документ (наш собственный, не чужие данные)
   * и его запись в индексе. Статус возвращается прежний: текущий документ не менялся.
   */
  function rollbackImport(id: string, previousStatus: SaveStatus): void {
    removeDocument(id)
    persistIndex((current) => removeMeta(current, id))
    status.value = previousStatus
  }

  /** Переименовывает не текущий документ прямо в хранилище. */
  function renameStored(id: string, name: string): boolean {
    const doc = readDocument(id)
    if (doc === null) {
      hideUnreadable(id)
      return false
    }
    const next: LayoutDocument = { ...doc, name, updatedAt: new Date().toISOString() }
    return writeDocument(next) && persistIndex((current) => upsertMeta(current, toMeta(next)))
  }

  /** Переименовывает документ; имя обрезается до `DOCUMENT_NAME_MAX_LENGTH`, пустое (после обрезки пробелов) — отказ. */
  function rename(id: string, name: string): boolean {
    const next = truncateName(name)
    if (next === '') return false
    if (id !== currentId.value) return renameStored(id, next)
    if (!layout.renameDocument(next)) return true
    return persistCurrent()
  }

  /** Удаляет документ; удаление текущего открывает самый свежий из оставшихся или новый пустой. */
  function remove(id: string): boolean {
    const wasCurrent = id === currentId.value
    if (wasCurrent) clearTimer()
    removeDocument(id)
    sync.markDeleted(id)
    const ok = persistIndex((current) => removeMeta(current, id))
    if (wasCurrent) {
      currentId.value = null
      openAvailable(null)
    }
    return ok
  }

  return {
    metas,
    currentId,
    status,
    syncState,
    isDemo,
    loadSeq,
    entries,
    init,
    refreshIndex,
    refreshSync,
    stopSync,
    flush,
    create,
    importDocument,
    switchTo,
    rename,
    remove,
  }
})
