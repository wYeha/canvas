/** Чтение и проверка переменных окружения бэкенда: файл `.env` и zod-схема конфигурации. */

import { z } from 'zod'
import {
  DEFAULT_DATABASE_PATH,
  DEFAULT_HOST,
  DEFAULT_LOG_LEVEL,
  DEFAULT_PORT,
  ENV_FILE_PATH,
  LOG_LEVELS,
  MAX_PORT,
  PASSWORD_HASH_PATTERN,
} from '@/constants'

/** Булев флаг окружения: только `true` или `false`, чтобы опечатка не включала и не выключала молча. */
function envFlag(defaultValue: boolean) {
  return z
    .enum(['true', 'false'])
    .default(defaultValue ? 'true' : 'false')
    .transform((value) => value === 'true')
}

const configSchema = z.object({
  HOST: z.string().trim().min(1).default(DEFAULT_HOST),
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
  DATABASE_PATH: z.string().trim().min(1).default(DEFAULT_DATABASE_PATH),
  PASSWORD_HASH: z
    .string({ error: 'не задан: сгенерируйте командой npm run hash-password -w backend' })
    .trim()
    .regex(PASSWORD_HASH_PATTERN, { error: 'ожидается хэш argon2 ($argon2id$...)' }),
  // Secure-cookie по умолчанию: браузеры принимают её и на http://localhost; выключать только для dev по сети без HTTPS
  COOKIE_SECURE: envFlag(true),
  // За nginx IP клиента берётся из X-Forwarded-For (нужно лимиту попыток входа); без прокси — выключено
  TRUST_PROXY: envFlag(false),
})

/** Проверенная конфигурация сервера. */
export interface Config {
  host: string
  port: number
  logLevel: (typeof LOG_LEVELS)[number]
  databasePath: string
  passwordHash: string
  cookieSecure: boolean
  trustProxy: boolean
}

/** Проверяет переменные окружения и возвращает конфигурацию; при ошибке бросает исключение с перечнем полей. */
export function parseConfig(env: Record<string, string | undefined>): Config {
  const result = configSchema.safeParse(env)
  if (!result.success) {
    const fields = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new Error(`Некорректные переменные окружения: ${fields}`)
  }
  const data = result.data
  return {
    host: data.HOST,
    port: data.PORT,
    logLevel: data.LOG_LEVEL,
    databasePath: data.DATABASE_PATH,
    passwordHash: data.PASSWORD_HASH,
    cookieSecure: data.COOKIE_SECURE,
    trustProxy: data.TRUST_PROXY,
  }
}

/** Подгружает `.env` в `process.env`, если файл есть; отсутствие файла не ошибка (значения по умолчанию). */
export function loadEnvFile(path: string = ENV_FILE_PATH): void {
  try {
    process.loadEnvFile(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return
    throw new Error(`Не удалось прочитать файл окружения ${path}`, { cause: error })
  }
}
