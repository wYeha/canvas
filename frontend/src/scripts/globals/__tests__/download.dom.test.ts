/** Тесты downloadText: создание ссылки с именем файла, клик, отложенный отзыв URL, ошибка. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadText } from '@/scripts/globals/download'

/** Исходные дескрипторы URL.createObjectURL и URL.revokeObjectURL (могут отсутствовать). */
const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')

/** Возвращает дескриптор на место или удаляет свойство, если его не было. */
function restore(key: 'createObjectURL' | 'revokeObjectURL', descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) Object.defineProperty(URL, key, descriptor)
  else Reflect.deleteProperty(URL, key)
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  restore('createObjectURL', originalCreate)
  restore('revokeObjectURL', originalRevoke)
})

/** Заменитель createObjectURL, который падает. */
function failingCreate(): never {
  throw new Error('нельзя')
}

describe('downloadText', () => {
  it('кликает по ссылке с именем файла, URL отзывается позже по таймеру', () => {
    vi.useFakeTimers()
    const create = vi.fn().mockReturnValue('blob:test')
    const revoke = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    expect(downloadText('a.html', '<p>', 'text/html')).toBe(true)
    expect(click).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledTimes(1)
    expect(revoke).not.toHaveBeenCalled()
    expect(document.querySelector('a')).toBeNull()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith('blob:test')
  })

  it('при ошибке возвращает false', () => {
    Object.defineProperty(URL, 'createObjectURL', { value: failingCreate, configurable: true })
    expect(downloadText('a.html', 'x', 'text/html')).toBe(false)
  })
})
