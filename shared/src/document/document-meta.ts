/** Краткая запись о документе для списка (индекс localStorage, ответ API): без загрузки самого документа. */
import { z } from 'zod'
import { nodeIdSchema } from './node'

/** Запись списка документов: id, имя, время изменения, число корневых блоков. */
export const documentMetaSchema = z.object({
  id: nodeIdSchema,
  name: z.string(),
  updatedAt: z.iso.datetime(),
  rootCount: z.int().min(0),
})

/** Запись списка документов. */
export type DocumentMeta = z.infer<typeof documentMetaSchema>
