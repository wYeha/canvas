/** Тестовые заглушки синхронизации: localStorage на Map и сервер документов в памяти поверх подменённого fetch. */
import { vi } from 'vitest'
import type { LayoutDocument } from '@shared'
import { DOCUMENT_STORAGE_PREFIX, DOCUMENTS_INDEX_STORAGE_KEY } from '@/scripts/globals/constants'

/** Сервер в памяти: документы, журнал удалений, переключатели «нет сети» и «сессия истекла», журнал запросов `МЕТОД путь`. */
export interface FakeServer {
  docs: Map<string, LayoutDocument>
  deletedIds: Set<string>
  offline: { value: boolean }
  unauthorized: { value: boolean }
  requests: string[]
}

/** Подменяет localStorage Map-ом. */
export function stubMemoryStorage(): Map<string, string> {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    /** Читает значение. */
    getItem: (key: string): string | null => data.get(key) ?? null,
    /** Пишет значение. */
    setItem: (key: string, value: string): void => void data.set(key, value),
    /** Удаляет значение. */
    removeItem: (key: string): void => void data.delete(key),
  })
  return data
}

/** Кладёт документ в localStorage вместе с записью индекса. */
export function seedLocal(data: Map<string, string>, doc: LayoutDocument): void {
  data.set(DOCUMENT_STORAGE_PREFIX + doc.id, JSON.stringify(doc))
  const index = (JSON.parse(data.get(DOCUMENTS_INDEX_STORAGE_KEY) ?? '[]') as { id: string }[]).filter(
    (item) => item.id !== doc.id,
  )
  index.push({ id: doc.id, name: doc.name, updatedAt: doc.updatedAt, rootCount: doc.roots.length } as { id: string })
  data.set(DOCUMENTS_INDEX_STORAGE_KEY, JSON.stringify(index))
}

/** JSON-ответ. */
function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

/** Отвечает на запрос к `/api/documents[/:id]` по данным сервера. */
function respond(server: FakeServer, method: string, id: string | null, body: unknown): Response {
  if (id === null) {
    const metas = [...server.docs.values()].map((doc) => ({
      id: doc.id,
      name: doc.name,
      updatedAt: doc.updatedAt,
      rootCount: doc.roots.length,
    }))
    return json(200, metas)
  }
  const existing = server.docs.get(id)
  if (method === 'PUT') {
    server.docs.set(id, body as LayoutDocument)
    server.deletedIds.delete(id)
    return json(existing ? 200 : 201, body)
  }
  if (!existing) return json(404, { error: { code: 'DOCUMENT_NOT_FOUND', message: 'нет' } })
  if (method === 'DELETE') {
    server.docs.delete(id)
    server.deletedIds.add(id)
    return json(204)
  }
  return json(200, existing)
}

/** Подменяет fetch сервером документов в памяти. */
export function stubDocumentsServer(): FakeServer {
  const server: FakeServer = {
    docs: new Map(),
    deletedIds: new Set(),
    offline: { value: false },
    unauthorized: { value: false },
    requests: [],
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET'
      const path = url.replace('/api/documents', '')
      server.requests.push(`${method} ${url}`)
      if (server.offline.value) return Promise.reject(new TypeError('Failed to fetch'))
      if (server.unauthorized.value) return Promise.resolve(json(401))
      if (url === '/api/deleted-documents') return Promise.resolve(json(200, [...server.deletedIds]))
      const id = path === '' ? null : decodeURIComponent(path.slice(1))
      const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
      return Promise.resolve(respond(server, method, id, body))
    }),
  )
  return server
}

/** Удаляет документ на сервере «с другого устройства»: с записью в журнал удалений. */
export function removeOnServer(server: FakeServer, id: string): void {
  server.docs.delete(id)
  server.deletedIds.add(id)
}
