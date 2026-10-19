/** Создание Fastify-приложения: настройки, плагины и маршруты. Запуск — в `main.ts`, чтобы тесты собирали сервер без прослушивания порта. */

import rateLimit from '@fastify/rate-limit'
import type { Database } from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import type { Config } from '@/config'
import { API_PREFIX, BODY_LIMIT_BYTES, ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS_TOO_MANY_REQUESTS } from '@/constants'
import { authPlugin } from '@/plugins/auth'
import { registerErrorHandlers } from '@/plugins/errors'
import { authRoutes } from '@/routes/auth'
import { documentRoutes } from '@/routes/documents'
import { healthRoutes } from '@/routes/health'

/** Настройки сервера из конфигурации (адрес и порт нужны только при запуске). */
export type ServerConfig = Pick<Config, 'logLevel' | 'passwordHash' | 'cookieSecure' | 'trustProxy'>

/** Внешние зависимости сервера: открытая база (сервер закрывает её при остановке). */
export interface ServerDeps {
  db: Database
}

/** Ошибка превышения лимита в виде, который единый обработчик ошибок отдаёт как `{ error: { code, message } }`. */
function rateLimitError(): { statusCode: number; code: string; message: string } {
  return {
    statusCode: HTTP_STATUS_TOO_MANY_REQUESTS,
    code: ERROR_CODES.rateLimited,
    message: ERROR_MESSAGES.rateLimited,
  }
}

/** Собирает сервер по конфигурации; порт не открывает. Все маршруты, кроме входа и health, закрыты сессией. */
export async function buildServer(config: ServerConfig, deps: ServerDeps): Promise<FastifyInstance> {
  const { db } = deps
  const app = Fastify({
    logger: { level: config.logLevel },
    bodyLimit: BODY_LIMIT_BYTES,
    trustProxy: config.trustProxy,
  })
  app.addHook('onClose', () => {
    db.close()
  })
  registerErrorHandlers(app)
  // Лимит не глобальный: включается в конфиге маршрута входа
  await app.register(rateLimit, { global: false, errorResponseBuilder: rateLimitError })
  await app.register(authPlugin, { db })
  await app.register(healthRoutes, { prefix: API_PREFIX })
  await app.register(authRoutes, {
    prefix: API_PREFIX,
    db,
    passwordHash: config.passwordHash,
    cookieSecure: config.cookieSecure,
  })
  await app.register(
    async (scope) => {
      scope.addHook('onRequest', scope.requireAuth)
      await scope.register(documentRoutes, { db })
    },
    { prefix: API_PREFIX },
  )
  return app
}
