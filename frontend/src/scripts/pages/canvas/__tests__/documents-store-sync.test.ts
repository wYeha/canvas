/** Тесты хранилища документов вместе с синхронизацией: запуск с сессией, отправка правок, обновление текущего, удаление, истёкшая сессия. */
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LayoutDocument } from '@shared'
import { useAuthStore } from '@/scripts/globals/auth-store'
import { AUTOSAVE_DELAY_MS, SYNC_DELAY_MS } from '@/scripts/pages/canvas/documents-constants'
import { useDocumentsStore } from '@/scripts/pages/canvas/documents-store'
import { createDocument } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import {
  removeOnServer,
  seedLocal,
  stubDocumentsServer,
  stubMemoryStorage,
  type FakeServer,
} from './fake-documents-server'

const T0 = new Date('2026-01-10T00:00:00.000Z')
const OLD = '2026-01-01T00:00:00.000Z'
const NEWER = '2026-01-05T00:00:00.000Z'

let storage: Map<string, string>
let server: FakeServer

/** Документ с заданными id, именем и временем изменения. */
function doc(id: string, name: string, updatedAt: string): LayoutDocument {
  return { ...createDocument(name), id, updatedAt, createdAt: OLD }
}

/** Запускает хранилище с сессией и дожидается первого прохода синхронизации. */
async function start(): Promise<ReturnType<typeof useDocumentsStore>> {
  useAuthStore().state = 'authenticated'
  const documents = useDocumentsStore()
  documents.init({ demo: false })
  await vi.runOnlyPendingTimersAsync()
  return documents
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  storage = stubMemoryStorage()
  server = stubDocumentsServer()
  setActivePinia(createPinia())
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('хранилище документов с синхронизацией', () => {
  it('без сессии синхронизации нет: статус «в браузере», запросов нет', () => {
    useAuthStore().state = 'offline'
    const documents = useDocumentsStore()
    documents.init({ demo: false })
    expect(documents.syncState).toBe('off')
    expect(server.requests).toEqual([])
  })

  it('с сессией документ с сервера появляется в списке, локальный уходит на сервер', async () => {
    seedLocal(storage, doc('local', 'Локальный', OLD))
    server.docs.set('remote', doc('remote', 'С сервера', NEWER))
    const documents = await start()
    expect(documents.entries.map((meta) => meta.name).sort()).toEqual(['Локальный', 'С сервера'])
    expect(server.docs.has('local')).toBe(true)
    expect(documents.syncState).toBe('synced')
  })

  it('новое устройство: пустая заглушка заменяется документами с сервера и не остаётся там дублем', async () => {
    server.docs.set('remote', doc('remote', 'С сервера', NEWER))
    const documents = await start()
    await vi.runOnlyPendingTimersAsync()
    expect(documents.entries.map((meta) => meta.id)).toEqual(['remote'])
    expect(documents.currentId).toBe('remote')
    expect([...server.docs.keys()]).toEqual(['remote'])
    expect(server.requests.some((request) => request.startsWith('PUT'))).toBe(false)
  })

  it('правленная заглушка остаётся рядом с документами с сервера', async () => {
    useAuthStore().state = 'offline'
    const documents = useDocumentsStore()
    documents.init({ demo: false })
    useLayoutStore().renameDocument('Мой')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS)
    server.docs.set('remote', doc('remote', 'С сервера', NEWER))
    useAuthStore().state = 'authenticated'
    documents.refreshSync()
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS)
    expect(documents.entries.map((meta) => meta.name).sort()).toEqual(['Мой', 'С сервера'])
  })

  it('правка сохраняется локально и после паузы уходит PUT', async () => {
    seedLocal(storage, doc('a', 'Документ', OLD))
    const documents = await start()
    useLayoutStore().renameDocument('Переименован')
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + SYNC_DELAY_MS)
    expect(server.docs.get('a')?.name).toBe('Переименован')
    expect(documents.syncState).toBe('synced')
  })

  it('текущий документ, изменённый на сервере, открывается свежим при чистом редакторе', async () => {
    seedLocal(storage, doc('a', 'Старое', OLD))
    const documents = await start()
    server.docs.set('a', doc('a', 'С другого устройства', NEWER))
    documents.refreshSync()
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS)
    expect(useLayoutStore().document.name).toBe('С другого устройства')
  })

  it('локальная правка не теряется, если параллельно пришла версия с сервера: свежая правка уходит на сервер', async () => {
    seedLocal(storage, doc('a', 'Старое', OLD))
    const documents = await start()
    server.docs.set('a', doc('a', 'С другого устройства', NEWER))
    useLayoutStore().renameDocument('Правка здесь')
    documents.refreshSync()
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS + SYNC_DELAY_MS)
    expect(useLayoutStore().document.name).toBe('Правка здесь')
    expect(server.docs.get('a')?.name).toBe('Правка здесь')
  })

  it('текущий документ, удалённый на другом устройстве, закрывается', async () => {
    seedLocal(storage, doc('a', 'A', OLD))
    seedLocal(storage, doc('b', 'B', NEWER))
    const documents = await start()
    expect(documents.currentId).toBe('b')
    removeOnServer(server, 'b')
    documents.refreshSync()
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS)
    expect(documents.currentId).toBe('a')
    expect(documents.entries.map((meta) => meta.id)).toEqual(['a'])
  })

  it('удаление документа удаляет его и на сервере', async () => {
    seedLocal(storage, doc('a', 'A', OLD))
    seedLocal(storage, doc('b', 'B', NEWER))
    const documents = await start()
    documents.remove('a')
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS)
    expect([...server.docs.keys()]).toEqual(['b'])
  })

  it('сервер ответил 401 — сессия помечена истёкшей', async () => {
    server.unauthorized.value = true
    await start()
    expect(useAuthStore().state).toBe('anonymous')
  })
})
