/** Тесты downloadText: создание ссылки с именем файла, клик, отзыв URL, ошибка. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadText } from '@/scripts/globals/download'

afterEach(() => {
  vi.restoreAllMocks()
})

/** Заменитель createObjectURL, который падает. */
function failingCreate(): never {
  throw new Error('нельзя')
}

describe('downloadText', () => {
  it('кликает по ссылке с именем файла и отзывает URL', () => {
    const create = vi.fn().mockReturnValue('blob:test')
    const revoke = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    expect(downloadText('a.html', '<p>', 'text/html')).toBe(true)
    expect(click).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledWith('blob:test')
    expect(document.querySelector('a')).toBeNull()
  })

  it('при ошибке возвращает false', () => {
    Object.defineProperty(URL, 'createObjectURL', { value: failingCreate, configurable: true })
    expect(downloadText('a.html', 'x', 'text/html')).toBe(false)
  })
})
