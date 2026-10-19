/** SQL-запросы к таблице documents: список, чтение, создание, сохранение (создать или заменить), удаление. */

import type { Database } from 'better-sqlite3'
import { z } from 'zod'
import { documentMetaSchema, parseDocument, type DocumentMeta, type LayoutDocument } from '@shared'

/** Строка списка из базы: проверяется схемой, чтобы испорченная запись не ушла клиенту. */
const metaRowSchema = z.object({ id: z.string(), name: z.string(), updated_at: z.string(), root_count: z.number() })

/** Результат сохранения: документа не было — создан, был — заменён. */
export type SaveResult = 'created' | 'updated'

/** Параметры запроса из документа: колонки дублируют поля документа, в `data` — документ целиком. */
function toRow(doc: LayoutDocument): Record<string, string | number> {
  return {
    id: doc.id,
    name: doc.name,
    data: JSON.stringify(doc),
    schemaVersion: doc.schemaVersion,
    rootCount: doc.roots.length,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

/** Список документов, свежие первыми; испорченные строки пропускаются. */
export function listDocuments(db: Database): DocumentMeta[] {
  const rows = db.prepare('SELECT id, name, updated_at, root_count FROM documents ORDER BY updated_at DESC, id').all()
  return rows.flatMap((row) => {
    const parsed = metaRowSchema.safeParse(row)
    if (!parsed.success) return []
    const { id, name, updated_at: updatedAt, root_count: rootCount } = parsed.data
    const meta = documentMetaSchema.safeParse({ id, name, updatedAt, rootCount })
    return meta.success ? [meta.data] : []
  })
}

/** Документ по id; `null`, если его нет. Если данные в базе не проходят схему — исключение (это ошибка сервера). */
export function getDocument(db: Database, id: string): LayoutDocument | null {
  const data: unknown = db.prepare('SELECT data FROM documents WHERE id = ?').pluck().get(id)
  if (data === undefined) return null
  if (typeof data !== 'string') throw new Error(`Документ «${id}» в базе повреждён: data не строка`)
  let json: unknown
  try {
    json = JSON.parse(data)
  } catch (error) {
    throw new Error(`Документ «${id}» в базе повреждён: не JSON`, { cause: error })
  }
  const result = parseDocument(json)
  if (!result.ok) throw new Error(`Документ «${id}» в базе повреждён: ${result.error}`)
  return result.document
}

/** Создаёт документ; `false`, если документ с таким id уже есть (ничего не меняется). */
export function createDocument(db: Database, doc: LayoutDocument): boolean {
  const info = db
    .prepare(
      `INSERT INTO documents (id, name, data, schema_version, root_count, created_at, updated_at)
       VALUES (@id, @name, @data, @schemaVersion, @rootCount, @createdAt, @updatedAt)
       ON CONFLICT (id) DO NOTHING`,
    )
    .run(toRow(doc))
  return info.changes === 1
}

/** Сохраняет документ целиком: создаёт, если его нет, иначе заменяет. Проверка и запись — в одной транзакции. */
export function saveDocument(db: Database, doc: LayoutDocument): SaveResult {
  const exists = db.prepare('SELECT 1 FROM documents WHERE id = ?').pluck()
  const upsert = db.prepare(
    `INSERT INTO documents (id, name, data, schema_version, root_count, created_at, updated_at)
     VALUES (@id, @name, @data, @schemaVersion, @rootCount, @createdAt, @updatedAt)
     ON CONFLICT (id) DO UPDATE SET
       name = excluded.name,
       data = excluded.data,
       schema_version = excluded.schema_version,
       root_count = excluded.root_count,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
  )
  return db.transaction((): SaveResult => {
    const created = exists.get(doc.id) === undefined
    upsert.run(toRow(doc))
    return created ? 'created' : 'updated'
  })()
}

/** Удаляет документ; `false`, если его не было. */
export function deleteDocument(db: Database, id: string): boolean {
  return db.prepare('DELETE FROM documents WHERE id = ?').run(id).changes === 1
}
