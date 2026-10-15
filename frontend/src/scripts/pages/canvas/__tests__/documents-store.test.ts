/** Тесты хранилища документов: запуск, автосохранение (fake timers), создание, переключение, переименование, удаление, демо. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CURRENT_DOCUMENT_STORAGE_KEY,
  DOCUMENT_STORAGE_PREFIX,
  DOCUMENTS_INDEX_STORAGE_KEY,
} from '@/scripts/globals/constants'
import { AUTOSAVE_DELAY_MS } from '@/scripts/pages/canvas/documents-constants'
import { useDocumentsStore } from '@/scripts/pages/canvas/documents-store'
import { createDocument } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'

const AT = { x: 0, y: 0 }
const T0 = new Date('2026-01-01T00:00:00.000Z')

/** Подменяет localStorage Map-ом; `failWrites` имитирует переполнение квоты. */
function stubStorage(): { data: Map<string, string>; fail: { writes: boolean } } {
  const data = new Map<string, string>()
  const fail = { writes: false }
  /** Читает значение. */
  const getItem = (key: string): string | null => data.get(key) ?? null
  /** Пишет значение или бросает ошибку квоты. */
  const setItem = (key: string, value: string): void => {
    if (fail.writes) throw new Error('QuotaExceededError')
    data.set(key, value)
  }
  /** Удаляет значение. */
  const removeItem = (key: string): void => void data.delete(key)
  vi.stubGlobal('localStorage', { getItem, setItem, removeItem })
  return { data, fail }
}

let storage: ReturnType<typeof stubStorage>

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  storage = stubStorage()
  setActivePinia(createPinia())
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Кладёт готовый документ в хранилище вместе с индексом; возвращает его. */
function seed(name: string, updatedAt: string, roots = 0) {
  const doc = { ...createDocument(name), updatedAt, createdAt: updatedAt }
  storage.data.set(DOCUMENT_STORAGE_PREFIX + doc.id, JSON.stringify(doc))
  const index = JSON.parse(storage.data.get(DOCUMENTS_INDEX_STORAGE_KEY) ?? '[]') as unknown[]
  index.push({ id: doc.id, name, updatedAt, rootCount: roots })
  storage.data.set(DOCUMENTS_INDEX_STORAGE_KEY, JSON.stringify(index))
  return doc
}

/** Кладёт «Текущий» документ, который новее всех остальных заготовок: именно он откроется при запуске. */
function seedCurrent() {
  return seed('Текущий', '2026-01-01T00:00:00.000Z')
}

/** Читает сохранённый документ. */
function stored(id: string): { name: string; roots: unknown[] } {
  return JSON.parse(storage.data.get(DOCUMENT_STORAGE_PREFIX + id) ?? 'null') as { name: string; roots: unknown[] }
}

/** Читает индекс из хранилища. */
function storedIndex(): { id: string; name: string }[] {
  return JSON.parse(storage.data.get(DOCUMENTS_INDEX_STORAGE_KEY) ?? '[]') as { id: string; name: string }[]
}

/** Запускает хранилища (не демо). */
function start() {
  const documents = useDocumentsStore()
  const layout = useLayoutStore()
  documents.init({ demo: false })
  return { documents, layout }
}

describe('запуск', () => {
  it('без документов создаёт пустой «Без названия» и сразу сохраняет его', () => {
    const { documents, layout } = start()
    expect(layout.document.name).toBe('Без названия')
    expect(documents.status).toBe('saved')
    expect(documents.currentId).toBe(layout.document.id)
    expect(storedIndex().map((m) => m.id)).toEqual([layout.document.id])
    expect(storage.data.get(CURRENT_DOCUMENT_STORAGE_KEY)).toBe(layout.document.id)
  })

  it('открывает последний текущий, а не самый свежий', () => {
    seed('Старый', '2026-01-01T00:00:00.000Z')
    const fresh = seed('Свежий', '2026-02-01T00:00:00.000Z')
    const older = seed('Другой', '2025-12-01T00:00:00.000Z')
    storage.data.set(CURRENT_DOCUMENT_STORAGE_KEY, older.id)
    expect(start().layout.document.id).toBe(older.id)
    expect(fresh.id).not.toBe(older.id)
  })

  it('без записи о текущем открывает самый свежий', () => {
    seed('Старый', '2026-01-01T00:00:00.000Z')
    const fresh = seed('Свежий', '2026-02-01T00:00:00.000Z')
    expect(start().layout.document.id).toBe(fresh.id)
  })

  it('битый документ пропускается с предупреждением и удаляется из списка', () => {
    const good = seed('Хороший', '2026-01-01T00:00:00.000Z')
    const bad = seed('Битый', '2026-02-01T00:00:00.000Z')
    storage.data.set(DOCUMENT_STORAGE_PREFIX + bad.id, '{"id": 1}')
    storage.data.set(CURRENT_DOCUMENT_STORAGE_KEY, bad.id)
    const { documents, layout } = start()
    expect(layout.document.id).toBe(good.id)
    expect(console.warn).toHaveBeenCalled()
    expect(documents.entries.map((m) => m.id)).toEqual([good.id])
    expect(storedIndex().map((m) => m.id)).toEqual([good.id])
  })

  it('все документы битые — создаётся новый пустой', () => {
    const bad = seed('Битый', '2026-02-01T00:00:00.000Z')
    storage.data.set(DOCUMENT_STORAGE_PREFIX + bad.id, 'не json')
    const { documents, layout } = start()
    expect(layout.document.id).not.toBe(bad.id)
    expect(documents.entries).toHaveLength(1)
  })

  it('повреждённый индекс не роняет запуск', () => {
    storage.data.set(DOCUMENTS_INDEX_STORAGE_KEY, '{{')
    const { layout } = start()
    expect(layout.document.name).toBe('Без названия')
  })
})

describe('автосохранение', () => {
  it('правка → «Сохраняется…», через задержку → «Сохранено», документ и индекс записаны', () => {
    const { documents, layout } = start()
    layout.addRoot('flex', 'Корень', AT)
    expect(documents.status).toBe('saving')
    expect(stored(layout.document.id).roots).toHaveLength(0)
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS)
    expect(documents.status).toBe('saved')
    expect(stored(layout.document.id).roots).toHaveLength(1)
  })

  it('частые правки склеиваются в одну запись (debounce)', () => {
    const { layout } = start()
    const write = vi.spyOn(localStorage, 'setItem')
    layout.addRoot('flex', 'A', AT)
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1)
    layout.addRoot('flex', 'B', AT)
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1)
    expect(write).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(stored(layout.document.id).roots).toHaveLength(2)
  })

  it('открытие документа само по себе ничего не пишет', () => {
    seed('Док', '2026-01-01T00:00:00.000Z')
    const { documents } = start()
    expect(documents.status).toBe('saved')
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2)
    expect(documents.status).toBe('saved')
  })

  it('переполнение квоты — статус «error», следующая правка пробует снова', () => {
    const { documents, layout } = start()
    storage.fail.writes = true
    layout.addRoot('flex', 'A', AT)
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS)
    expect(documents.status).toBe('error')
    storage.fail.writes = false
    layout.addRoot('flex', 'B', AT)
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS)
    expect(documents.status).toBe('saved')
    expect(stored(layout.document.id).roots).toHaveLength(2)
  })

  it('flush дописывает отложенное сохранение сразу', () => {
    const { documents, layout } = start()
    layout.addRoot('flex', 'A', AT)
    expect(documents.flush()).toBe(true)
    expect(stored(layout.document.id).roots).toHaveLength(1)
    expect(documents.status).toBe('saved')
  })
})

describe('создание', () => {
  it('новый документ становится текущим, предыдущий сохраняется', () => {
    const { documents, layout } = start()
    const firstId = layout.document.id
    layout.addRoot('flex', 'A', AT)
    expect(documents.create()).toBe(true)
    expect(layout.document.id).not.toBe(firstId)
    expect(layout.document.name).toBe('Без названия')
    expect(layout.document.roots).toHaveLength(0)
    expect(stored(firstId).roots).toHaveLength(1)
    expect(documents.entries).toHaveLength(2)
    expect(documents.currentId).toBe(layout.document.id)
  })
})

describe('переключение', () => {
  it('сохраняет текущий, загружает другой, сбрасывает историю, выделение и увеличивает loadSeq', () => {
    const other = seed('Другой', '2025-01-01T00:00:00.000Z', 0)
    seedCurrent()
    const { documents, layout } = start()
    const firstId = layout.document.id
    layout.createRoot('flex', AT)
    expect(layout.canUndo).toBe(true)
    expect(layout.selectedId).not.toBeNull()
    const seq = documents.loadSeq
    expect(documents.switchTo(other.id)).toBe(true)
    expect(layout.document.id).toBe(other.id)
    expect(layout.canUndo).toBe(false)
    expect(layout.selectedId).toBeNull()
    expect(documents.loadSeq).toBe(seq + 1)
    expect(stored(firstId).roots).toHaveLength(1)
    expect(storage.data.get(CURRENT_DOCUMENT_STORAGE_KEY)).toBe(other.id)
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2)
    expect(documents.status).toBe('saved')
  })

  it('на самого себя — ничего не меняется', () => {
    const { documents, layout } = start()
    const seq = documents.loadSeq
    expect(documents.switchTo(layout.document.id)).toBe(true)
    expect(documents.loadSeq).toBe(seq)
  })

  it('битый документ не открывается, остаёмся на текущем, запись убирается из списка', () => {
    const bad = seed('Битый', '2025-01-01T00:00:00.000Z')
    storage.data.set(DOCUMENT_STORAGE_PREFIX + bad.id, '{}')
    seedCurrent()
    const { documents, layout } = start()
    const currentId = layout.document.id
    storage.data.set(CURRENT_DOCUMENT_STORAGE_KEY, currentId)
    expect(documents.switchTo(bad.id)).toBe(false)
    expect(layout.document.id).toBe(currentId)
    expect(documents.entries.some((m) => m.id === bad.id)).toBe(false)
  })

  it('если текущий не удалось сохранить, переключения нет (правки не теряются)', () => {
    const other = seed('Другой', '2025-01-01T00:00:00.000Z')
    seedCurrent()
    const { documents, layout } = start()
    const currentId = layout.document.id
    layout.addRoot('flex', 'A', AT)
    storage.fail.writes = true
    expect(documents.switchTo(other.id)).toBe(false)
    expect(layout.document.id).toBe(currentId)
    expect(documents.status).toBe('error')
  })
})

describe('переименование', () => {
  it('текущего: название в редакторе, в списке и в хранилище, undo его не откатывает', () => {
    const { documents, layout } = start()
    layout.addRoot('flex', 'A', AT)
    expect(documents.rename(layout.document.id, '  Лендинг ')).toBe(true)
    expect(layout.document.name).toBe('Лендинг')
    expect(documents.entries[0]?.name).toBe('Лендинг')
    expect(stored(layout.document.id).name).toBe('Лендинг')
    layout.undo()
    expect(layout.document.name).toBe('Лендинг')
  })

  it('не текущего: правится в хранилище и индексе', () => {
    const other = seed('Другой', '2025-01-01T00:00:00.000Z')
    seedCurrent()
    const { documents, layout } = start()
    const currentId = layout.document.id
    expect(documents.rename(other.id, 'Новое имя')).toBe(true)
    expect(stored(other.id).name).toBe('Новое имя')
    expect(documents.entries.find((m) => m.id === other.id)?.name).toBe('Новое имя')
    expect(layout.document.id).toBe(currentId)
  })

  it('пустое имя — откат без изменений', () => {
    const { documents, layout } = start()
    const writes = vi.spyOn(localStorage, 'setItem')
    expect(documents.rename(layout.document.id, '   ')).toBe(false)
    expect(layout.document.name).toBe('Без названия')
    expect(writes).not.toHaveBeenCalled()
  })
})

describe('удаление', () => {
  it('не текущего: убирается из хранилища и списка', () => {
    const other = seed('Другой', '2025-01-01T00:00:00.000Z')
    seedCurrent()
    const { documents, layout } = start()
    const currentId = layout.document.id
    expect(documents.remove(other.id)).toBe(true)
    expect(storage.data.has(DOCUMENT_STORAGE_PREFIX + other.id)).toBe(false)
    expect(storedIndex().map((m) => m.id)).toEqual([currentId])
    expect(layout.document.id).toBe(currentId)
  })

  it('текущего: открывается самый свежий из оставшихся', () => {
    seed('Старый', '2025-01-01T00:00:00.000Z')
    const fresh = seed('Свежий', '2025-06-01T00:00:00.000Z')
    const { documents, layout } = start()
    documents.create()
    const removedId = layout.document.id
    expect(documents.remove(removedId)).toBe(true)
    expect(layout.document.id).toBe(fresh.id)
    expect(storage.data.has(DOCUMENT_STORAGE_PREFIX + removedId)).toBe(false)
  })

  it('единственного: создаётся новый пустой', () => {
    const { documents, layout } = start()
    const removedId = layout.document.id
    layout.addRoot('flex', 'A', AT)
    expect(documents.remove(removedId)).toBe(true)
    expect(layout.document.id).not.toBe(removedId)
    expect(layout.document.roots).toHaveLength(0)
    expect(documents.entries).toHaveLength(1)
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2)
    expect(storage.data.has(DOCUMENT_STORAGE_PREFIX + removedId)).toBe(false)
  })
})

describe('демо', () => {
  it('открывается временным документом: статус «demo», правки не сохраняются, в список не попадает', () => {
    const documents = useDocumentsStore()
    const layout = useLayoutStore()
    documents.init({ demo: true })
    expect(documents.isDemo).toBe(true)
    expect(documents.status).toBe('demo')
    expect(documents.currentId).toBeNull()
    expect(layout.document.roots.length).toBeGreaterThan(0)
    layout.addRoot('flex', 'Правка', AT)
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2)
    expect(documents.status).toBe('demo')
    expect(documents.flush()).toBe(true)
    expect(storage.data.size).toBe(0)
  })
})
