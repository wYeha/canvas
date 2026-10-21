/** DOM-тесты releaseFieldOnMouseDown: строка навигации не берёт фокус, но снимает его с открытого поля ввода. */
import { afterEach, describe, expect, it } from 'vitest'
import { releaseFieldOnMouseDown } from '@/scripts/globals/focus'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Нажатие кнопкой мыши `button`; возвращает событие (для проверки defaultPrevented). */
function press(button: number): MouseEvent {
  const event = new MouseEvent('mousedown', { button, cancelable: true })
  releaseFieldOnMouseDown(event)
  return event
}

describe('releaseFieldOnMouseDown', () => {
  it('левой кнопкой: фокус не переносится, поле ввода теряет фокус (срабатывает его blur)', () => {
    const area = document.createElement('textarea')
    let blurred = false
    area.addEventListener('blur', () => {
      blurred = true
    })
    document.body.append(area)
    area.focus()
    expect(press(0).defaultPrevented).toBe(true)
    expect(blurred).toBe(true)
    expect(document.activeElement).toBe(document.body)
  })

  it('не поле ввода (кнопка) в фокусе остаётся; другие кнопки мыши не трогает', () => {
    const button = document.createElement('button')
    document.body.append(button)
    button.focus()
    press(0)
    expect(document.activeElement).toBe(button)
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    expect(press(2).defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(input)
  })
})
