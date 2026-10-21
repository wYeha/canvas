/** Тестовые данные бэкенда: минимальный валидный документ, база в памяти, сервер с тестовым паролем и вход. */

import argon2 from 'argon2'
import type { Database } from 'better-sqlite3'
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify'
import { SCHEMA_VERSION, type BlockNode, type LayoutDocument } from '@shared'
import { openDatabase } from '@/db/connection'
import { IN_MEMORY_DATABASE } from '@/db/db-constants'
import { buildServer } from '@/server'

/** Минимальный flex-блок без детей. */
export function blockFixture(id: string): BlockNode {
  return {
    id,
    type: 'block',
    label: id,
    description: '',
    tag: 'div',
    container: { kind: 'flex', direction: 'row', wrap: false, justify: 'flex-start', align: 'stretch' },
    self: {},
    repeat: 1,
    children: [],
  }
}

/** Валидный документ с заданным числом корневых блоков; поля можно переопределить. */
export function documentFixture(overrides: Partial<LayoutDocument> = {}, rootCount = 1): LayoutDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'doc-1',
    name: 'Дашборд',
    rules: '',
    labelCounter: rootCount,
    roots: Array.from({ length: rootCount }, (_, index) => ({
      canvas: { x: index * 100, y: 0, width: 1440, height: null, exportMaxWidth: false },
      node: blockFixture(`root-${String(index)}`),
    })),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }
}

/** Новая пустая база в памяти с применёнными миграциями. */
export function memoryDatabase(): Database {
  return openDatabase(IN_MEMORY_DATABASE)
}

/** Пароль, под который собирается тестовый сервер. */
export const TEST_PASSWORD = 'пароль-для-тестов'

/** Облегчённые параметры argon2: в тестах важна логика, а не стойкость хэша. */
const TEST_ARGON2_OPTIONS = { memoryCost: 1024, timeCost: 2 }

let passwordHashPromise: Promise<string> | null = null

/** Хэш тестового пароля; считается один раз на файл тестов. */
export function testPasswordHash(): Promise<string> {
  passwordHashPromise ??= argon2.hash(TEST_PASSWORD, TEST_ARGON2_OPTIONS)
  return passwordHashPromise
}

/** Сервер на базе в памяти с тестовым паролем; логи выключены, `trustProxy` — как за nginx. */
export async function buildTestServer(db: Database = memoryDatabase(), trustProxy = false): Promise<FastifyInstance> {
  const passwordHash = await testPasswordHash()
  return buildServer({ logLevel: 'silent', passwordHash, cookieSecure: true, trustProxy }, { db })
}

/** Входит тестовым паролем и возвращает заголовок `cookie` для следующих запросов. */
export async function loginCookie(app: FastifyInstance): Promise<string> {
  const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { password: TEST_PASSWORD } })
  const [cookie] = response.cookies
  if (response.statusCode !== 204 || !cookie) throw new Error('Тестовый вход не удался')
  return `${cookie.name}=${cookie.value}`
}

/** Запрос с cookie сессии. */
export function injectWithCookie(
  app: FastifyInstance,
  cookie: string,
  options: InjectOptions,
): Promise<LightMyRequestResponse> {
  return app.inject({ ...options, headers: { ...options.headers, cookie } })
}
