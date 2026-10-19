/** Тесты разбора ячейки «Клавиши»: клавиши в кавычках становятся чипами, остальное — текстом. */
import { describe, expect, it } from 'vitest'
import { splitHotkeyKeys, toGroupViews } from '@/scripts/modals/hotkeys-modal/hotkeys-keys'

describe('splitHotkeyKeys', () => {
  it('сочетание: клавиши и знаки между ними', () => {
    expect(splitHotkeyKeys('`Ctrl` + `D`')).toEqual([
      { kind: 'key', text: 'Ctrl' },
      { kind: 'text', text: '+' },
      { kind: 'key', text: 'D' },
    ])
  })

  it('клавиша с пояснением текстом', () => {
    expect(splitHotkeyKeys('`Shift` + колесо')).toEqual([
      { kind: 'key', text: 'Shift' },
      { kind: 'text', text: '+ колесо' },
    ])
  })

  it('без клавиш — один текст', () => {
    expect(splitHotkeyKeys('Средняя кнопка мыши')).toEqual([{ kind: 'text', text: 'Средняя кнопка мыши' }])
  })

  it('одиночный символ ? — чип', () => {
    expect(splitHotkeyKeys('`?`')).toEqual([{ kind: 'key', text: '?' }])
  })
})

describe('toGroupViews', () => {
  it('сохраняет заголовок, действие и исходную ячейку, разбирая клавиши', () => {
    const [group] = toGroupViews([{ title: 'Т', rows: [{ keys: '`F`', action: 'Блок' }] }])
    expect(group?.title).toBe('Т')
    expect(group?.rows[0]).toEqual({ keys: '`F`', action: 'Блок', parts: [{ kind: 'key', text: 'F' }] })
  })
})
