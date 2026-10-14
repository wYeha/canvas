/** Тесты copyText: Clipboard API, запасной путь через textarea, полный отказ. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from '@/scripts/globals/clipboard'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Заменитель execCommand, который запрещает копирование. */
function throwingExec(): never {
  throw new Error('запрещено')
}

describe('copyText', () => {
  it('использует navigator.clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    expect(await copyText('abc')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('abc')
  })

  it('при отказе Clipboard API копирует через execCommand и убирает textarea', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('нет прав')) } })
    const exec = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
    expect(await copyText('abc')).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('без Clipboard API и при ошибке execCommand возвращает false', async () => {
    vi.stubGlobal('navigator', {})
    Object.defineProperty(document, 'execCommand', { value: throwingExec, configurable: true })
    expect(await copyText('abc')).toBe(false)
  })
})
