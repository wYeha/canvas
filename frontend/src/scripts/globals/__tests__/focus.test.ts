/** Тесты keepFocusOnMouseDown: фокус не переносится только при клике левой кнопкой. */
import { describe, expect, it, vi } from 'vitest'
import { keepFocusOnMouseDown } from '@/scripts/globals/focus'

/** Создаёт заглушку MouseEvent с нужной кнопкой и отдельный шпион preventDefault. */
function mouseDown(button: number): { event: MouseEvent; prevent: ReturnType<typeof vi.fn> } {
  const prevent = vi.fn()
  return { event: { button, preventDefault: prevent } as unknown as MouseEvent, prevent }
}

describe('keepFocusOnMouseDown', () => {
  it('отменяет перенос фокуса для левой кнопки', () => {
    const { event, prevent } = mouseDown(0)
    keepFocusOnMouseDown(event)
    expect(prevent).toHaveBeenCalledOnce()
  })

  it('не трогает среднюю и правую кнопки', () => {
    const middle = mouseDown(1)
    const right = mouseDown(2)
    keepFocusOnMouseDown(middle.event)
    keepFocusOnMouseDown(right.event)
    expect(middle.prevent).not.toHaveBeenCalled()
    expect(right.prevent).not.toHaveBeenCalled()
  })
})
