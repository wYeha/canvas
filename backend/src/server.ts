/** Создание Fastify-приложения: настройки, плагины и маршруты. Запуск — в `main.ts`, чтобы тесты собирали сервер без прослушивания порта. */

import type { Database } from 'better-sqlite3'
import Fastify, { type FastifyInstance } from 'fastify'
import type { Config } from '@/config'
import { API_PREFIX, BODY_LIMIT_BYTES } from '@/constants'
import { registerErrorHandlers } from '@/plugins/errors'
import { documentRoutes } from '@/routes/documents'
import { healthRoutes } from '@/routes/health'

/** Внешние зависимости сервера: открытая база (сервер закрывает её при остановке). */
export interface ServerDeps {
  db: Database
}

/** Собирает сервер по конфигурации; порт не открывает. */
export async function buildServer(config: Pick<Config, 'logLevel'>, deps: ServerDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel }, bodyLimit: BODY_LIMIT_BYTES })
  app.addHook('onClose', () => {
    deps.db.close()
  })
  registerErrorHandlers(app)
  await app.register(healthRoutes, { prefix: API_PREFIX })
  await app.register(documentRoutes, { prefix: API_PREFIX, db: deps.db })
  return app
}
