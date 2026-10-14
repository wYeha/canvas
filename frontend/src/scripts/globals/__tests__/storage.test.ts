/** Тесты обёртки над localStorage: чтение, запись и устойчивость к ошибкам доступа. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStorageItem, setStorageItem } from '@/scripts/globals/storage'

const KEY = 'test-key'

/** Подменяет глобальный localStorage простым хранилищем на Map (DOM-окружение не нужно). */
function stubWorkingStorage(): Map<string, string> {
  const data = new Map<string, string>()
  /** Читает значение из Map. */
  const getItem = (key: string): string | null => data.get(key) ?? null
  /** Пишет значение в Map. */
  const setItem = (key: string, value: string): void => void data.set(key, value)
  vi.stubGlobal('localStorage', { getItem, setItem })
  return data
}

/** Подменяет localStorage хранилищем, любой вызов которого бросает ошибку. */
function stubBrokenStorage(): void {
  /** Имитирует недоступное хранилище. */
  const fail = (): never => {
    throw new Error('недоступно')
  }
  vi.stubGlobal('localStorage', { getItem: fail, setItem: fail })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('storage', () => {
  it('записывает и читает значение', () => {
    const data = stubWorkingStorage()
    expect(setStorageItem(KEY, 'value')).toBe(true)
    expect(data.get(KEY)).toBe('value')
    expect(getStorageItem(KEY)).toBe('value')
  })

  it('возвращает null для отсутствующего ключа', () => {
    stubWorkingStorage()
    expect(getStorageItem(KEY)).toBeNull()
  })

  it('не бросает при недоступном хранилище', () => {
    stubBrokenStorage()
    expect(getStorageItem(KEY)).toBeNull()
    expect(setStorageItem(KEY, 'value')).toBe(false)
  })
})
