/** Единый формат ошибки API `{ error: { code, message } }`: общий тип для бэкенда и схема разбора ответа на фронте. */
import { z } from 'zod'

/** Тело ответа с ошибкой. */
export const apiErrorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})

/** Тело ответа с ошибкой. */
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
