/** Единый формат ошибок API `{ error: { code, message } }`: обработчики ошибок и неизвестных маршрутов. */

import type { FastifyError, FastifyInstance } from 'fastify'
import type { ApiErrorBody } from '@shared'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL,
  HTTP_STATUS_NOT_FOUND,
} from '@/constants'

/** Собирает тело ответа с ошибкой. */
export function apiError(code: string, message: string): ApiErrorBody {
  return { error: { code, message } }
}

/** Клиентская ли ошибка (4xx): её текст можно отдать наружу, в отличие от 5xx. */
function isClientError(statusCode: number | undefined): statusCode is number {
  return statusCode !== undefined && statusCode >= HTTP_STATUS_BAD_REQUEST && statusCode < HTTP_STATUS_INTERNAL
}

/** Подключает обработчики: 4xx отдаются с кодом Fastify и текстом, 5xx — общим текстом без подробностей. */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (isClientError(error.statusCode)) {
      return reply.status(error.statusCode).send(apiError(error.code || ERROR_CODES.badRequest, error.message))
    }
    request.log.error(error)
    return reply.status(HTTP_STATUS_INTERNAL).send(apiError(ERROR_CODES.internal, ERROR_MESSAGES.internal))
  })
  app.setNotFoundHandler((_request, reply) =>
    reply.status(HTTP_STATUS_NOT_FOUND).send(apiError(ERROR_CODES.notFound, ERROR_MESSAGES.notFound)),
  )
}
