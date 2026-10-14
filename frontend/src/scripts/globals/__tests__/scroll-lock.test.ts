/** Тесты блокировки прокрутки: счётчик вложенных блокировок и возврат прежнего overflow. */
import { describe, expect, it } from 'vitest'
import { createScrollLock } from '@/scripts/globals/scroll-lock'

describe('createScrollLock', () => {
  it('скрывает прокрутку и возвращает прежнее значение', () => {
    const target = { style: { overflow: 'auto' } }
    const lock = createScrollLock(target)
    lock.lock()
    expect(target.style.overflow).toBe('hidden')
    lock.unlock()
    expect(target.style.overflow).toBe('auto')
  })

  it('вложенные блокировки снимаются только последней', () => {
    const target = { style: { overflow: '' } }
    const lock = createScrollLock(target)
    lock.lock()
    lock.lock()
    lock.unlock()
    expect(target.style.overflow).toBe('hidden')
    lock.unlock()
    expect(target.style.overflow).toBe('')
  })

  it('лишний unlock ничего не ломает', () => {
    const target = { style: { overflow: 'scroll' } }
    const lock = createScrollLock(target)
    lock.unlock()
    expect(target.style.overflow).toBe('scroll')
  })
})
