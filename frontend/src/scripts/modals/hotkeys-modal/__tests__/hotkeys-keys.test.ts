/** Тесты разбора ячейки «Клавиши»: клавиши в кавычках становятся чипами, остальное — текстом. */
import { describe, expect, it } from 'vitest'
import { splitHotkeyKeys, toGroupViews } from '@/scripts/modals/hotkeys-modal/hotkeys-keys'

describe('splitHotkeyKeys', () => {
  it('сочетание: клавиши и знаки между ними', () => {
    expect(splitHotkeyKeys('`Ctrl` + `D`')).toEqual([
      { kind: 'key', text: 'Ctrl', key: '`Ctrl` + `D`:1' },
      { kind: 'text', text: '+', key: '`Ctrl` + `D`:2' },
      { kind: 'key', text: 'D', key: '`Ctrl` + `D`:3' },
    ])
  })

  it('клавиша с пояснением текстом', () => {
    expect(splitHotkeyKeys('`Shift` + колесо')).toEqual([
      { kind: 'key', text: 'Shift', key: '`Shift` + колесо:1' },
      { kind: 'text', text: '+ колесо', key: '`Shift` + колесо:2' },
    ])
  })

  it('без клавиш — один текст', () => {
    expect(splitHotkeyKeys('Средняя кнопка мыши')).toEqual([
      { kind: 'text', text: 'Средняя кнопка мыши', key: 'Средняя кнопка мыши:0' },
    ])
  })

  it('одиночный символ ? — чип', () => {
    expect(splitHotkeyKeys('`?`')).toEqual([{ kind: 'key', text: '?', key: '`?`:1' }])
  })
})

describe('ключи частей', () => {
  it('уникальны внутри ячейки и стабильны между вызовами', () => {
    const keys = splitHotkeyKeys('`Alt` + `↑` / `↓`').map((part) => part.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(splitHotkeyKeys('`Alt` + `↑` / `↓`').map((part) => part.key)).toEqual(keys)
  })
})

describe('toGroupViews', () => {
  it('сохраняет заголовок, действие и исходную ячейку, разбирая клавиши', () => {
    const [group] = toGroupViews([{ title: 'Т', rows: [{ keys: '`F`', action: 'Блок' }] }])
    expect(group?.title).toBe('Т')
    expect(group?.rows[0]).toEqual({ keys: '`F`', action: 'Блок', parts: [{ kind: 'key', text: 'F', key: '`F`:1' }] })
  })
})
