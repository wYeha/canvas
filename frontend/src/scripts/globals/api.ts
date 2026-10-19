/**
 * Клиент API: запрос к бэкенду с разбором ответа zod-схемой из `@shared` и единым видом ошибки.
 * Исключений наружу не бросает: сеть, ответ сервера и формат данных сводятся к `ApiResult`.
 */
import type { z } from 'zod'
import { apiErrorBodySchema } from '@shared'
import { API_BASE, API_TIMEOUT_MS, HTTP_STATUS } from '@/scripts/globals/constants'

/**
 * Вид ошибки: `network` — сервер не ответил (нет сети, бэкенд не запущен), `server` — ответ 5xx,
 * `unauthorized` — нет действительной сессии, `rejected` — сервер отклонил запрос (4xx), `invalid-response` — ответ не того формата.
 */
export type ApiFailureKind = 'network' | 'server' | 'unauthorized' | 'rejected' | 'invalid-response'

/** Ошибка запроса: вид, статус (если ответ был), код и текст ошибки сервера (если он их прислал). */
export interface ApiFailure {
  kind: ApiFailureKind
  status: number | null
  code: string | null
  message: string | null
}

/** Результат запроса. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure }

/** Метод запроса. */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Параметры запроса: метод, тело (уйдёт JSON) и схема ответа; без схемы тело ответа не читается. */
export interface ApiRequestOptions<S extends z.ZodType | undefined> {
  method?: ApiMethod
  body?: unknown
  schema?: S
}

/** Данные успешного ответа: по схеме или `undefined`, если схемы нет. */
type ApiData<S> = S extends z.ZodType ? z.output<S> : undefined

/** Собирает ошибку. */
function failure(
  kind: ApiFailureKind,
  status: number | null,
  code: string | null = null,
  message: string | null = null,
): ApiFailure {
  return { kind, status, code, message }
}

/** Читает тело ответа как JSON; `undefined`, если тела нет или это не JSON. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown
  } catch {
    return undefined
  }
}

/** Ошибка из неуспешного ответа: вид по статусу, код и текст — из тела `{ error }`, если оно есть. */
async function failureFrom(response: Response): Promise<ApiFailure> {
  const body = apiErrorBodySchema.safeParse(await readJson(response))
  const code = body.success ? body.data.error.code : null
  const message = body.success ? body.data.error.message : null
  if (response.status === HTTP_STATUS.UNAUTHORIZED) return failure('unauthorized', response.status, code, message)
  const kind = response.status >= HTTP_STATUS.SERVER_ERROR ? 'server' : 'rejected'
  return failure(kind, response.status, code, message)
}

/** Выполняет `fetch`; `null`, если сервер не ответил или не уложился в `API_TIMEOUT_MS`. */
async function send(path: string, method: ApiMethod, body: unknown): Promise<Response | null> {
  const init: RequestInit = { method, credentials: 'same-origin', signal: AbortSignal.timeout(API_TIMEOUT_MS) }
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  try {
    return await fetch(API_BASE + path, init)
  } catch {
    return null
  }
}

/** Запрос к API по пути относительно `/api`; успешный ответ проверяется схемой. */
export async function apiRequest<S extends z.ZodType | undefined = undefined>(
  path: string,
  options: ApiRequestOptions<S> = {},
): Promise<ApiResult<ApiData<S>>> {
  const response = await send(path, options.method ?? 'GET', options.body)
  if (response === null) return { ok: false, error: failure('network', null) }
  if (!response.ok) return { ok: false, error: await failureFrom(response) }
  const { schema } = options
  if (schema === undefined || response.status === HTTP_STATUS.NO_CONTENT) {
    return schema === undefined
      ? { ok: true, data: undefined as ApiData<S> }
      : { ok: false, error: failure('invalid-response', response.status) }
  }
  const parsed = schema.safeParse(await readJson(response))
  if (!parsed.success) return { ok: false, error: failure('invalid-response', response.status) }
  return { ok: true, data: parsed.data as ApiData<S> }
}

/** Сервер недоступен (нет ответа или 5xx): приложение продолжает работать офлайн. */
export function isUnavailable(error: ApiFailure): boolean {
  return error.kind === 'network' || error.kind === 'server'
}
