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
} from '@/constants'

const configSchema = z.object({
  HOST: z.string().trim().min(1).default(DEFAULT_HOST),
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
  DATABASE_PATH: z.string().trim().min(1).default(DEFAULT_DATABASE_PATH),
})

/** Проверенная конфигурация сервера. */
export interface Config {
  host: string
  port: number
  logLevel: (typeof LOG_LEVELS)[number]
  databasePath: string
}

/** Проверяет переменные окружения и возвращает конфигурацию; при ошибке бросает исключение с перечнем полей. */
export function parseConfig(env: Record<string, string | undefined>): Config {
  const result = configSchema.safeParse(env)
  if (!result.success) {
    const fields = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new Error(`Некорректные переменные окружения: ${fields}`)
  }
  const { HOST, PORT, LOG_LEVEL, DATABASE_PATH } = result.data
  return { host: HOST, port: PORT, logLevel: LOG_LEVEL, databasePath: DATABASE_PATH }
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
