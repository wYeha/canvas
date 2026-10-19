/** Маршруты входа: `POST /api/auth/login` (открыт, с лимитом попыток), `POST /api/auth/logout` (открыт, очищает cookie) и `GET /api/auth/me` (по сессии). */

import type { CookieSerializeOptions } from '@fastify/cookie'
import argon2 from 'argon2'
import type { Database } from 'better-sqlite3'
import type { FastifyPluginCallback } from 'fastify'
import { loginRequestSchema, type AuthStatus } from '@shared'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_NO_CONTENT,
  HTTP_STATUS_UNAUTHORIZED,
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_PATH,
  SESSION_TTL_MS,
} from '@/constants'
import { sessionToken } from '@/plugins/auth'
import { apiError } from '@/plugins/errors'
import { createSession, deleteExpiredSessions, deleteSession } from '@/services/sessions'

/** Опции плагина: база, хэш пароля и флаг Secure для cookie. */
export interface AuthRoutesOptions {
  db: Database
  passwordHash: string
  cookieSecure: boolean
}

/** Миллисекунд в секунде: `maxAge` cookie задаётся в секундах. */
const MS_PER_SECOND = 1000

/** Параметры cookie сессии: недоступна скриптам, только к API, не уходит с чужих сайтов. */
function cookieOptions(secure: boolean): CookieSerializeOptions {
  return { path: SESSION_COOKIE_PATH, httpOnly: true, sameSite: 'strict', secure }
}

/** Сверяет пароль с хэшем; битый хэш или ошибка argon2 — «не совпал», а не 500. */
async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

/** Регистрирует маршруты входа (под префиксом `/api`). */
export const authRoutes: FastifyPluginCallback<AuthRoutesOptions> = (app, { db, passwordHash, cookieSecure }, done) => {
  app.post(
    '/auth/login',
    { config: { rateLimit: { max: LOGIN_RATE_LIMIT_MAX, timeWindow: LOGIN_RATE_LIMIT_WINDOW_MS } } },
    async (request, reply) => {
      const parsed = loginRequestSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply
          .status(HTTP_STATUS_BAD_REQUEST)
          .send(apiError(ERROR_CODES.validation, ERROR_MESSAGES.invalidPassword))
      }
      if (!(await verifyPassword(passwordHash, parsed.data.password))) {
        return reply
          .status(HTTP_STATUS_UNAUTHORIZED)
          .send(apiError(ERROR_CODES.invalidPassword, ERROR_MESSAGES.invalidPassword))
      }
      const now = new Date()
      deleteExpiredSessions(db, now)
      const token = createSession(db, now, SESSION_TTL_MS)
      void reply.setCookie(SESSION_COOKIE_NAME, token, {
        ...cookieOptions(cookieSecure),
        maxAge: SESSION_TTL_MS / MS_PER_SECOND,
      })
      return reply.status(HTTP_STATUS_NO_CONTENT).send()
    },
  )

  // Выход открыт: и с истёкшей сессией cookie нужно очистить
  app.post('/auth/logout', (request, reply) => {
    const token = sessionToken(request)
    if (token !== null) deleteSession(db, token)
    void reply.clearCookie(SESSION_COOKIE_NAME, cookieOptions(cookieSecure))
    return reply.status(HTTP_STATUS_NO_CONTENT).send()
  })

  app.get('/auth/me', { onRequest: app.requireAuth }, (): AuthStatus => ({ authenticated: true }))

  done()
}
