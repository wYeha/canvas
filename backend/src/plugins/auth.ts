/** Проверка сессии: cookie-плагин и декоратор `requireAuth` — хук `onRequest`, который пускает только с действительной сессией. */

import cookie from '@fastify/cookie'
import type { Database } from 'better-sqlite3'
import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify'
import fp from 'fastify-plugin'
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS_UNAUTHORIZED, SESSION_COOKIE_NAME } from '@/constants'
import { apiError } from '@/plugins/errors'
import { isSessionValid } from '@/services/sessions'

/** Хук проверки сессии. */
export type RequireAuthHook = (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => void

declare module 'fastify' {
  interface FastifyInstance {
    /** Хук `onRequest`: без действительной сессии отвечает 401. */
    requireAuth: RequireAuthHook
  }
}

/** Опции плагина: открытая база. */
export interface AuthPluginOptions {
  db: Database
}

/** Токен сессии из cookie запроса; `null`, если cookie нет. */
export function sessionToken(request: FastifyRequest): string | null {
  return request.cookies[SESSION_COOKIE_NAME] ?? null
}

/**
 * Подключает разбор cookie и декоратор `requireAuth`. Обёрнут в `fastify-plugin`, чтобы декоратор был виден
 * всем маршрутам сервера, а не только внутри этого плагина.
 */
export const authPlugin = fp<AuthPluginOptions>(async (app, { db }) => {
  await app.register(cookie)
  app.decorate('requireAuth', (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
    const token = sessionToken(request)
    if (token !== null && isSessionValid(db, token, new Date())) {
      done()
      return
    }
    // Ответ отправлен — done не вызывается, обработчик маршрута не запускается
    void reply.status(HTTP_STATUS_UNAUTHORIZED).send(apiError(ERROR_CODES.unauthorized, ERROR_MESSAGES.unauthorized))
  })
})
