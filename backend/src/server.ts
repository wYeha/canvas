/** Создание Fastify-приложения: настройки, плагины и маршруты. Запуск — в `main.ts`, чтобы тесты собирали сервер без прослушивания порта. */

import Fastify, { type FastifyInstance } from 'fastify'
import type { Config } from '@/config'
import { API_PREFIX, BODY_LIMIT_BYTES } from '@/constants'
import { registerErrorHandlers } from '@/plugins/errors'
import { healthRoutes } from '@/routes/health'

/** Собирает сервер по конфигурации; порт не открывает. */
export async function buildServer(config: Pick<Config, 'logLevel'>): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel }, bodyLimit: BODY_LIMIT_BYTES })
  registerErrorHandlers(app)
  await app.register(healthRoutes, { prefix: API_PREFIX })
  return app
}
