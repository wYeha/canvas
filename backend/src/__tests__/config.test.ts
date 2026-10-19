/** Тесты чтения конфигурации: значения по умолчанию, приведение типов, обязательный хэш пароля, ошибки. */

import { describe, expect, it } from 'vitest'
import { parseConfig } from '@/config'
import { DEFAULT_DATABASE_PATH, DEFAULT_HOST, DEFAULT_LOG_LEVEL, DEFAULT_PORT } from '@/constants'

const HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$aGFzaA'

describe('parseConfig', () => {
  it('с одним хэшем пароля берёт значения по умолчанию', () => {
    expect(parseConfig({ PASSWORD_HASH: HASH })).toEqual({
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      logLevel: DEFAULT_LOG_LEVEL,
      databasePath: DEFAULT_DATABASE_PATH,
      passwordHash: HASH,
      cookieSecure: true,
      trustProxy: false,
    })
  })

  it('читает и приводит значения', () => {
    expect(
      parseConfig({
        HOST: '0.0.0.0',
        PORT: '8080',
        LOG_LEVEL: 'warn',
        DATABASE_PATH: '/var/lib/lc.db',
        PASSWORD_HASH: HASH,
        COOKIE_SECURE: 'false',
        TRUST_PROXY: 'true',
      }),
    ).toEqual({
      host: '0.0.0.0',
      port: 8080,
      logLevel: 'warn',
      databasePath: '/var/lib/lc.db',
      passwordHash: HASH,
      cookieSecure: false,
      trustProxy: true,
    })
  })

  it('без хэша пароля или с хэшем не argon2 — ошибка с подсказкой', () => {
    expect(() => parseConfig({})).toThrow(/PASSWORD_HASH.*hash-password/)
    expect(() => parseConfig({ PASSWORD_HASH: 'plain-password' })).toThrow(/PASSWORD_HASH/)
  })

  it('отклоняет некорректный порт, уровень логов и флаги', () => {
    const base = { PASSWORD_HASH: HASH }
    expect(() => parseConfig({ ...base, PORT: 'abc' })).toThrow(/PORT/)
    expect(() => parseConfig({ ...base, PORT: '70000' })).toThrow(/PORT/)
    expect(() => parseConfig({ ...base, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/)
    expect(() => parseConfig({ ...base, COOKIE_SECURE: 'yes' })).toThrow(/COOKIE_SECURE/)
  })
})
