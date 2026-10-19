/** Запросы документов к API: список, журнал удалений, документ целиком, сохранение (создать или заменить), удаление. */
import { z } from 'zod'
import {
  deletedDocumentIdsSchema,
  documentMetaSchema,
  layoutDocumentSchema,
  type DocumentMeta,
  type LayoutDocument,
} from '@shared'
import { apiRequest, type ApiResult } from '@/scripts/globals/api'
import { HTTP_STATUS } from '@/scripts/globals/constants'

/** Путь списка документов. */
const DOCUMENTS_PATH = '/documents'

/** Путь журнала удалённых на сервере документов. */
const DELETED_DOCUMENTS_PATH = '/deleted-documents'

/** Путь документа по id (id кодируется: в нём могут быть любые символы). */
function documentPath(id: string): string {
  return `${DOCUMENTS_PATH}/${encodeURIComponent(id)}`
}

/** Список документов на сервере (мета, без содержимого). */
export function fetchDocumentList(): Promise<ApiResult<DocumentMeta[]>> {
  return apiRequest(DOCUMENTS_PATH, { schema: z.array(documentMetaSchema) })
}

/** id документов, удалённых на сервере: только их клиент удаляет у себя. */
export function fetchDeletedDocumentIds(): Promise<ApiResult<string[]>> {
  return apiRequest(DELETED_DOCUMENTS_PATH, { schema: deletedDocumentIdsSchema })
}

/** Документ целиком; ответ проверяется схемой документа. */
export function fetchDocument(id: string): Promise<ApiResult<LayoutDocument>> {
  return apiRequest(documentPath(id), { schema: layoutDocumentSchema })
}

/** Сохраняет документ на сервере: создаёт или заменяет целиком. */
export function putDocument(doc: LayoutDocument): Promise<ApiResult<LayoutDocument>> {
  return apiRequest(documentPath(doc.id), { method: 'PUT', body: doc, schema: layoutDocumentSchema })
}

/** Удаляет документ на сервере; уже отсутствующий — успех. */
export async function deleteRemoteDocument(id: string): Promise<ApiResult<undefined>> {
  const result = await apiRequest(documentPath(id), { method: 'DELETE' })
  if (!result.ok && result.error.status === HTTP_STATUS.NOT_FOUND) return { ok: true, data: undefined }
  return result
}
