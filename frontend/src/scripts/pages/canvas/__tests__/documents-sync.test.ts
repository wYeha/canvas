/** Тесты синхронизации документов на сервере в памяти: отправка, скачивание, удаления, сбои, 401, пауза и повтор прохода. */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { LayoutDocument } from '@shared'
import { DOCUMENT_STORAGE_PREFIX } from '@/scripts/globals/constants'
import { SYNC_DELAY_MS, SYNC_RETRY_MS } from '@/scripts/pages/canvas/documents-constants'
import { readIndex } from '@/scripts/pages/canvas/documents-storage'
import { createDocumentsSync, type DocumentsSyncDeps } from '@/scripts/pages/canvas/documents-sync'
import { readSyncRecord } from '@/scripts/pages/canvas/documents-sync-state'
import { createDocument } from '@/scripts/pages/canvas/factories'
import {
  removeOnServer,
  seedLocal,
  stubDocumentsServer,
  stubMemoryStorage,
  type FakeServer,
} from './fake-documents-server'

const T1 = '2026-01-01T00:00:00.000Z'
const T2 = '2026-01-02T00:00:00.000Z'

let storage: Map<string, string>
let server: FakeServer
let deps: {
  isEnabled: DocumentsSyncDeps['isEnabled']
  isPushable: DocumentsSyncDeps['isPushable']
  onRemoteChanges: Mock<DocumentsSyncDeps['onRemoteChanges']>
  onUnauthorized: Mock<DocumentsSyncDeps['onUnauthorized']>
}

/** Документ с заданными id, именем и временем изменения. */
function doc(id: string, name: string, updatedAt: string): LayoutDocument {
  return { ...createDocument(name), id, updatedAt, createdAt: T1 }
}

/** Синхронизация разрешена. */
function alwaysEnabled(): boolean {
  return true
}

/** Отправлять можно всё, кроме заглушки `p`. */
function notPlaceholder(id: string): boolean {
  return id !== 'p'
}

/** Синхронизация запрещена. */
function neverEnabled(): boolean {
  return false
}

beforeEach(() => {
  vi.useFakeTimers()
  storage = stubMemoryStorage()
  server = stubDocumentsServer()
  deps = {
    isEnabled: alwaysEnabled,
    isPushable: alwaysEnabled,
    onRemoteChanges: vi.fn<DocumentsSyncDeps['onRemoteChanges']>(),
    onUnauthorized: vi.fn<DocumentsSyncDeps['onUnauthorized']>(),
  }
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('синхронизация документов', () => {
  it('новый локальный документ уходит на сервер, версия запоминается', async () => {
    seedLocal(storage, doc('a', 'Локальный', T1))
    const sync = createDocumentsSync(deps)
    await sync.runNow()
    expect(server.docs.get('a')?.name).toBe('Локальный')
    expect(readSyncRecord().synced).toEqual({ a: T1 })
    expect(sync.state.value).toBe('synced')
  })

  it('документ с сервера скачивается в хранилище и список, страница узнаёт об этом', async () => {
    server.docs.set('b', doc('b', 'С сервера', T2))
    await createDocumentsSync(deps).runNow()
    expect(readIndex().map((meta) => meta.id)).toEqual(['b'])
    expect(storage.has(DOCUMENT_STORAGE_PREFIX + 'b')).toBe(true)
    expect(deps.onRemoteChanges).toHaveBeenCalledWith({ pulled: ['b'], removed: [] })
  })

  it('более свежая версия на сервере заменяет синхронизированную локальную', async () => {
    seedLocal(storage, doc('a', 'Старое', T1))
    const sync = createDocumentsSync(deps)
    await sync.runNow()
    server.docs.set('a', doc('a', 'Новое', T2))
    await sync.runNow()
    expect(readIndex()[0]?.name).toBe('Новое')
  })

  it('удаление локально удаляет на сервере; удалённый на сервере исчезает локально', async () => {
    seedLocal(storage, doc('a', 'A', T1))
    seedLocal(storage, doc('b', 'B', T1))
    const sync = createDocumentsSync(deps)
    await sync.runNow()
    storage.delete(DOCUMENT_STORAGE_PREFIX + 'a')
    sync.markDeleted('a')
    removeOnServer(server, 'b')
    await sync.runNow()
    expect([...server.docs.keys()]).toEqual([])
    expect([...server.deletedIds].sort()).toEqual(['a', 'b'])
    expect(readIndex().map((meta) => meta.id)).toEqual(['a'])
    expect(deps.onRemoteChanges).toHaveBeenLastCalledWith({ pulled: [], removed: ['b'] })
    expect(readSyncRecord()).toEqual({ synced: {}, deleted: [] })
  })

  it('документ, пропавший с сервера без записи в журнале (новая база), отправляется заново, а не удаляется', async () => {
    seedLocal(storage, doc('a', 'A', T1))
    const sync = createDocumentsSync(deps)
    await sync.runNow()
    server.docs.clear()
    await sync.runNow()
    expect(server.docs.has('a')).toBe(true)
    expect(readIndex().map((meta) => meta.id)).toEqual(['a'])
  })

  it('отклонённый сервером документ пропускается, остальные синхронизируются; итог — повтор позже', async () => {
    seedLocal(storage, doc('big', 'Большой', T1))
    seedLocal(storage, doc('ok', 'Обычный', T1))
    server.docs.set('remote', doc('remote', 'С сервера', T2))
    const fetchMock = vi.mocked(fetch)
    const original = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((url, init) =>
      typeof url === 'string' && url.endsWith('/big') && init?.method === 'PUT'
        ? Promise.resolve(new Response(null, { status: 413 }))
        : (original as typeof fetch)(url, init),
    )
    const sync = createDocumentsSync(deps)
    await sync.runNow()
    expect(server.docs.has('ok')).toBe(true)
    expect(server.docs.has('big')).toBe(false)
    expect(
      readIndex()
        .map((meta) => meta.id)
        .sort(),
    ).toEqual(['big', 'ok', 'remote'])
    expect(sync.state.value).toBe('failed')
  })

  it('нетронутая заглушка не отправляется', async () => {
    seedLocal(storage, doc('p', 'Без названия', T1))
    const sync = createDocumentsSync({ ...deps, isPushable: notPlaceholder })
    await sync.runNow()
    expect(server.docs.has('p')).toBe(false)
  })

  it('401 во время прохода с запрошенным повтором — сигнал странице без лишнего прохода', async () => {
    server.unauthorized.value = true
    const sync = createDocumentsSync(deps)
    const first = sync.runNow()
    void sync.runNow()
    await first
    expect(deps.onUnauthorized).toHaveBeenCalledOnce()
    expect(server.requests).toHaveLength(1)
  })

  it('нет сети — failed, повтор через паузу доводит до конца', async () => {
    seedLocal(storage, doc('a', 'A', T1))
    server.offline.value = true
    const sync = createDocumentsSync(deps)
    await sync.runNow()
    expect(sync.state.value).toBe('failed')
    server.offline.value = false
    await vi.advanceTimersByTimeAsync(SYNC_RETRY_MS)
    expect(sync.state.value).toBe('synced')
    expect(server.docs.has('a')).toBe(true)
  })

  it('401 — сессия истекла: состояние off и сигнал странице', async () => {
    server.unauthorized.value = true
    const sync = createDocumentsSync(deps)
    await sync.runNow()
    expect(sync.state.value).toBe('off')
    expect(deps.onUnauthorized).toHaveBeenCalledOnce()
  })

  it('выключена — без запросов', async () => {
    const sync = createDocumentsSync({ ...deps, isEnabled: neverEnabled })
    sync.request('change')
    await sync.runNow()
    expect(sync.state.value).toBe('off')
    expect(server.requests).toEqual([])
  })

  it('правки подряд — один проход после паузы; во время паузы статус «синхронизируется»', async () => {
    const sync = createDocumentsSync(deps)
    sync.request('change')
    sync.request('change')
    expect(sync.state.value).toBe('syncing')
    await vi.advanceTimersByTimeAsync(SYNC_DELAY_MS)
    expect(server.requests.filter((request) => request === 'GET /api/documents')).toHaveLength(1)
    expect(sync.state.value).toBe('synced')
  })

  it('запрос во время прохода ставит ещё один проход сразу после', async () => {
    seedLocal(storage, doc('a', 'A', T1))
    const sync = createDocumentsSync(deps)
    const first = sync.runNow()
    seedLocal(storage, doc('a', 'A2', T2))
    await sync.runNow()
    await first
    await vi.runOnlyPendingTimersAsync()
    expect(server.docs.get('a')?.name).toBe('A2')
  })

  it('после stop идущий проход не ставит повтор', async () => {
    server.offline.value = true
    const sync = createDocumentsSync(deps)
    const pass = sync.runNow()
    sync.stop()
    await pass
    server.offline.value = false
    await vi.advanceTimersByTimeAsync(SYNC_RETRY_MS)
    expect(server.requests).toHaveLength(1)
  })
})
