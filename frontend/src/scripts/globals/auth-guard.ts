/** Чистое решение навигации по состоянию сессии: куда пустить, куда перенаправить. Без Vue и роутера. */
import { LOGIN_REDIRECT_QUERY_PARAM, ROUTE_NAMES, ROUTE_PATHS } from '@/scripts/globals/constants'
import type { SessionState } from '@/scripts/globals/auth-store'

/** Цель перехода: имя маршрута, полный адрес, нужен ли вход, адрес возврата из параметров страницы входа. */
export interface GuardTarget {
  name: string | null
  fullPath: string
  requiresAuth: boolean
  redirect: unknown
}

/** Решение: пустить (`true`) или перейти по адресу / маршруту с параметрами. */
export type GuardDecision = true | string | { name: string; query: Record<string, string> }

/** Адрес возврата после входа: только внутренний путь (`/…`, не `//host`), иначе — редактор. */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return ROUTE_PATHS.CANVAS
  return value
}

/**
 * Решает переход: не вошедшего — на вход с адресом возврата; вошедшего со страницы входа — обратно.
 * `offline` и `unknown` пускают: без сервера редактор работает с локальными документами.
 */
export function resolveGuard(target: GuardTarget, state: SessionState): GuardDecision {
  if (target.name === ROUTE_NAMES.LOGIN) return state === 'authenticated' ? safeRedirect(target.redirect) : true
  if (target.requiresAuth && state === 'anonymous') {
    return { name: ROUTE_NAMES.LOGIN, query: { [LOGIN_REDIRECT_QUERY_PARAM]: target.fullPath } }
  }
  return true
}
