/** Тесты чтения конфигурации: значения по умолчанию, приведение типов, ошибки. */

import { describe, expect, it } from 'vitest'
import { parseConfig } from '@/config'
import { DEFAULT_HOST, DEFAULT_LOG_LEVEL, DEFAULT_PORT } from '@/constants'

describe('parseConfig', () => {
  it('без переменных берёт значения по умолчанию', () => {
    expect(parseConfig({})).toEqual({ host: DEFAULT_HOST, port: DEFAULT_PORT, logLevel: DEFAULT_LOG_LEVEL })
  })

  it('читает и приводит значения', () => {
    expect(parseConfig({ HOST: '0.0.0.0', PORT: '8080', LOG_LEVEL: 'warn' })).toEqual({
      host: '0.0.0.0',
      port: 8080,
      logLevel: 'warn',
    })
  })

  it('отклоняет некорректный порт и уровень логов', () => {
    expect(() => parseConfig({ PORT: 'abc' })).toThrow(/PORT/)
    expect(() => parseConfig({ PORT: '70000' })).toThrow(/PORT/)
    expect(() => parseConfig({ LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/)
  })
})
