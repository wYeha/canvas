/** Маршрут проверки работоспособности `GET /api/health`: открыт без авторизации, нужен nginx и мониторингу. */

import type { FastifyPluginCallback } from 'fastify'

/** Ответ проверки работоспособности. */
export interface HealthResponse {
  status: 'ok'
}

/** Регистрирует `GET /health` (под префиксом `/api`); плагин синхронный, поэтому завершается через `done`. */
export const healthRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get('/health', (): HealthResponse => ({ status: 'ok' }))
  done()
}
