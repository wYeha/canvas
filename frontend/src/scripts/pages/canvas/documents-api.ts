/** Запросы документов к API: список, документ целиком, сохранение (создать или заменить), удаление. */
import { z } from 'zod'
import { documentMetaSchema, layoutDocumentSchema, type DocumentMeta, type LayoutDocument } from '@shared'
import { apiRequest, type ApiResult } from '@/scripts/globals/api'

/** Путь списка документов. */
const DOCUMENTS_PATH = '/documents'

/** HTTP-статус «не найден»: удаление отсутствующего документа — тоже успех. */
const HTTP_NOT_FOUND = 404

/** Путь документа по id (id кодируется: в нём могут быть любые символы). */
function documentPath(id: string): string {
  return `${DOCUMENTS_PATH}/${encodeURIComponent(id)}`
}

/** Список документов на сервере (мета, без содержимого). */
export function fetchDocumentList(): Promise<ApiResult<DocumentMeta[]>> {
  return apiRequest(DOCUMENTS_PATH, { schema: z.array(documentMetaSchema) })
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
  if (!result.ok && result.error.status === HTTP_NOT_FOUND) return { ok: true, data: undefined }
  return result
}
