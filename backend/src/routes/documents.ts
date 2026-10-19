/** CRUD документов `/api/documents`: роуты только проверяют запрос zod-схемами из `@shared` и вызывают сервис. */

import type { Database } from 'better-sqlite3'
import type { FastifyPluginCallback, FastifyReply } from 'fastify'
import { z } from 'zod'
import { nodeIdSchema, parseDocument } from '@shared'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_CONFLICT,
  HTTP_STATUS_CREATED,
  HTTP_STATUS_NO_CONTENT,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_OK,
  MAX_DOCUMENT_ID_LENGTH,
} from '@/constants'
import { apiError } from '@/plugins/errors'
import { createDocument, deleteDocument, getDocument, listDocuments, saveDocument } from '@/services/documents'

/** Параметры маршрутов `/:id`. */
const idParamsSchema = z.object({ id: nodeIdSchema.max(MAX_DOCUMENT_ID_LENGTH) })

/** Опции плагина: открытая база. */
export interface DocumentRoutesOptions {
  db: Database
}

/** Отвечает 400 с кодом ошибки проверки. */
function sendBadRequest(reply: FastifyReply, code: string, message: string): FastifyReply {
  return reply.status(HTTP_STATUS_BAD_REQUEST).send(apiError(code, message))
}

/** Отвечает 404 «документ не найден». */
function sendNotFound(reply: FastifyReply): FastifyReply {
  return reply
    .status(HTTP_STATUS_NOT_FOUND)
    .send(apiError(ERROR_CODES.documentNotFound, ERROR_MESSAGES.documentNotFound))
}

/** id из параметров адреса или `null`, если он некорректен. */
function idFrom(params: unknown): string | null {
  const parsed = idParamsSchema.safeParse(params)
  return parsed.success ? parsed.data.id : null
}

/** Регистрирует маршруты документов (под префиксом `/api`). */
export const documentRoutes: FastifyPluginCallback<DocumentRoutesOptions> = (app, { db }, done) => {
  app.get('/documents', () => listDocuments(db))

  app.post('/documents', (request, reply) => {
    const parsed = parseDocument(request.body)
    if (!parsed.ok) return sendBadRequest(reply, ERROR_CODES.validation, parsed.error)
    // id должен быть годен и для адреса: иначе документ создастся, но прочитать его по `/:id` не выйдет
    if (idFrom({ id: parsed.document.id }) === null) {
      return sendBadRequest(reply, ERROR_CODES.validation, ERROR_MESSAGES.invalidId)
    }
    if (!createDocument(db, parsed.document)) {
      return reply
        .status(HTTP_STATUS_CONFLICT)
        .send(apiError(ERROR_CODES.documentExists, ERROR_MESSAGES.documentExists))
    }
    return reply.status(HTTP_STATUS_CREATED).send(parsed.document)
  })

  app.get('/documents/:id', (request, reply) => {
    const id = idFrom(request.params)
    if (id === null) return sendBadRequest(reply, ERROR_CODES.validation, ERROR_MESSAGES.invalidId)
    return getDocument(db, id) ?? sendNotFound(reply)
  })

  // PUT — создать или заменить целиком: фронт создаёт документы офлайн со своими id (10.6)
  app.put('/documents/:id', (request, reply) => {
    const id = idFrom(request.params)
    if (id === null) return sendBadRequest(reply, ERROR_CODES.validation, ERROR_MESSAGES.invalidId)
    const parsed = parseDocument(request.body)
    if (!parsed.ok) return sendBadRequest(reply, ERROR_CODES.validation, parsed.error)
    if (parsed.document.id !== id) return sendBadRequest(reply, ERROR_CODES.idMismatch, ERROR_MESSAGES.idMismatch)
    const result = saveDocument(db, parsed.document)
    return reply.status(result === 'created' ? HTTP_STATUS_CREATED : HTTP_STATUS_OK).send(parsed.document)
  })

  app.delete('/documents/:id', (request, reply) => {
    const id = idFrom(request.params)
    if (id === null) return sendBadRequest(reply, ERROR_CODES.validation, ERROR_MESSAGES.invalidId)
    return deleteDocument(db, id) ? reply.status(HTTP_STATUS_NO_CONTENT).send() : sendNotFound(reply)
  })

  done()
}
