/** Тесты copyText: Clipboard API, запасной путь через textarea, возврат фокуса, полный отказ. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from '@/scripts/globals/clipboard'

/** Исходный дескриптор document.execCommand (может отсутствовать). */
const originalExec = Object.getOwnPropertyDescriptor(document, 'execCommand')

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  if (originalExec) Object.defineProperty(document, 'execCommand', originalExec)
  else Reflect.deleteProperty(document, 'execCommand')
  document.body.innerHTML = ''
})

/** Заменитель execCommand, который запрещает копирование. */
function throwingExec(): never {
  throw new Error('запрещено')
}

/** Заменитель execCommand, у которого копирование удалось. */
function succeedingExec(): boolean {
  return true
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

  it('после запасного копирования фокус возвращается на прежний элемент', async () => {
    vi.stubGlobal('navigator', {})
    Object.defineProperty(document, 'execCommand', { value: succeedingExec, configurable: true })
    const button = document.createElement('button')
    document.body.appendChild(button)
    button.focus()
    expect(await copyText('abc')).toBe(true)
    expect(document.activeElement).toBe(button)
  })

  it('без Clipboard API и при ошибке execCommand возвращает false', async () => {
    vi.stubGlobal('navigator', {})
    Object.defineProperty(document, 'execCommand', { value: throwingExec, configurable: true })
    expect(await copyText('abc')).toBe(false)
  })
})
