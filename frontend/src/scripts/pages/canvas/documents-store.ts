/**
 * Pinia-хранилище документов: список в localStorage, текущий документ, автосохранение с задержкой,
 * создание, переключение, переименование и удаление. Демо-документ временный: не сохраняется и в список не попадает.
 */
import { computed, ref, toRaw, watch } from 'vue'
import { defineStore } from 'pinia'
import type { LayoutDocument } from '@shared'
import { AUTOSAVE_DELAY_MS, IMPORT_ERROR_FLUSH, IMPORT_ERROR_OPEN, IMPORT_ERROR_SAVE } from './documents-constants'
import { prepareImport } from './documents-files'
import { pickDocumentId, removeMeta, sortMetas, toMeta, upsertMeta } from './documents-index'
import {
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
import { createId } from '@/scripts/globals/id'

/** Результат добавления документа из файла: успех или причина отказа для тоста. */
export type ImportResult = { ok: true } | { ok: false; error: string }

/** Параметры запуска: открыть временный демо-документ вместо сохранённых. */
export interface DocumentsInitOptions {
  demo: boolean
}

export const useDocumentsStore = defineStore('documents', () => {
  const layout = useLayoutStore()
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

  /** Работа в демо-режиме: сохранение выключено. */
  const isDemo = computed(() => status.value === 'demo')

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

  /** Записывает индекс; ошибка записи отражается в статусе. */
  function persistIndex(next: DocumentMeta[]): boolean {
    metas.value = next
    const ok = writeIndex(next)
    if (!ok) status.value = 'error'
    return ok
  }

  /** Сохраняет текущий документ и его запись в индексе; обновляет статус. */
  function persistCurrent(): boolean {
    clearTimer()
    const doc = toRaw(layout.document)
    const ok = writeDocument(doc) && persistIndex(upsertMeta(metas.value, toMeta(doc)))
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

  /** Немедленно дописывает отложенное сохранение; `false`, если запись не удалась (переключаться нельзя: потеряем правки). */
  function flush(): boolean {
    if (!isAutosaveEnabled(status.value) || currentId.value === null) return true
    if (timer === null && status.value !== 'error') return true
    return persistCurrent()
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

  /** Убирает документ, который не удалось прочитать, из индекса и хранилища. */
  function dropBroken(id: string): void {
    removeDocument(id)
    metas.value = removeMeta(metas.value, id)
    writeIndex(metas.value)
  }

  /** Создаёт новый пустой документ, делает его текущим и сразу сохраняет (чтобы он попал в список). */
  function createAndOpen(): boolean {
    return activate(createDocument()) && persistCurrent()
  }

  /** Открывает предпочитаемый или самый свежий читаемый документ, битые выбрасывает; если ничего нет — создаёт пустой. */
  function openAvailable(preferredId: string | null): void {
    let id = pickDocumentId(metas.value, preferredId)
    while (id !== null) {
      const doc = readDocument(id)
      if (doc !== null && activate(doc)) return
      dropBroken(id)
      id = pickDocumentId(metas.value, null)
    }
    createAndOpen()
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
      return
    }
    status.value = 'saved'
    metas.value = readIndex()
    openAvailable(readCurrentId())
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
      dropBroken(id)
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
    if (!activate(prepareImport(doc, names, createId(), new Date()))) return { ok: false, error: IMPORT_ERROR_OPEN }
    return persistCurrent() ? { ok: true } : { ok: false, error: IMPORT_ERROR_SAVE }
  }

  /** Переименовывает не текущий документ прямо в хранилище. */
  function renameStored(id: string, name: string): boolean {
    const doc = readDocument(id)
    if (doc === null) {
      dropBroken(id)
      return false
    }
    const next: LayoutDocument = { ...doc, name, updatedAt: new Date().toISOString() }
    return writeDocument(next) && persistIndex(upsertMeta(metas.value, toMeta(next)))
  }

  /** Переименовывает документ; пустое имя (после обрезки пробелов) — отказ без изменений. */
  function rename(id: string, name: string): boolean {
    const next = name.trim()
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
    const ok = persistIndex(removeMeta(metas.value, id))
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
    isDemo,
    loadSeq,
    entries,
    init,
    flush,
    create,
    importDocument,
    switchTo,
    rename,
    remove,
  }
})
