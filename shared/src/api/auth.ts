/** Zod-схемы API входа: тело запроса `POST /api/auth/login` и ответ `GET /api/auth/me`. */
import { z } from 'zod'

/** Предельная длина пароля: argon2 принимает и длиннее, но мегабайтные строки — это не пароль, а нагрузка. */
export const MAX_PASSWORD_LENGTH = 1024

/** Тело запроса входа. */
export const loginRequestSchema = z.object({
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
})

/** Ответ проверки сессии: сессия действительна. */
export const authStatusSchema = z.object({
  authenticated: z.literal(true),
})

/** Тело запроса входа. */
export type LoginRequest = z.infer<typeof loginRequestSchema>

/** Ответ проверки сессии. */
export type AuthStatus = z.infer<typeof authStatusSchema>
