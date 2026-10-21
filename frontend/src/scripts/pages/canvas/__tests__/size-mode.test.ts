/** Тесты режимов размера: чтение (в том числе старое число без режима), главная ось, запись режима и числа. */
import { describe, expect, it } from 'vitest'
import {
  mainAxis,
  otherAxis,
  sizeMode,
  sizeValue,
  withSizeMode,
  withSizeValue,
  sizeMarks,
} from '@/scripts/pages/canvas/size-mode'

describe('sizeMode', () => {
  it('нет режима и числа — по содержимому; число без режима — фиксированный; явный режим важнее', () => {
    expect(sizeMode({}, 'width')).toBe('content')
    expect(sizeMode({ width: '120px' }, 'width')).toBe('fixed')
    expect(sizeMode({ width: '  ' }, 'width')).toBe('content')
    expect(sizeMode({ heightMode: 'fill' }, 'height')).toBe('fill')
    expect(sizeMode({ widthMode: 'fixed' }, 'width')).toBe('fixed')
    expect(sizeValue({ width: ' 10px ' }, 'width')).toBe('10px')
  })

  it('главная ось: row — ширина, column — высота', () => {
    expect(mainAxis('row')).toBe('width')
    expect(mainAxis('row-reverse')).toBe('width')
    expect(mainAxis('column')).toBe('height')
    expect(mainAxis('column-reverse')).toBe('height')
    expect(otherAxis('width')).toBe('height')
  })
})

describe('запись режима и числа', () => {
  it('авто стирает режим и число; заполнить стирает число, по главной оси сбрасывает свободный flex', () => {
    const self = { flex: '2', widthMode: 'fixed' as const, width: '300px' }
    expect(withSizeMode(self, 'width', 'content', true)).toEqual({ flex: '2' })
    expect(withSizeMode(self, 'width', 'fill', true)).toEqual({ flex: '0 1 auto', widthMode: 'fill' })
    expect(withSizeMode(self, 'width', 'fill', false)).toEqual({ flex: '2', widthMode: 'fill' })
    expect(withSizeMode({ width: '10px' }, 'width', 'fixed', true)).toEqual({ width: '10px', widthMode: 'fixed' })
  })

  it('число делает режим фиксированным; пустое — фиксированный без числа; вход не меняется', () => {
    const self = Object.freeze({ widthMode: 'fill' as const })
    expect(withSizeValue(self, 'width', ' 360px ')).toEqual({ widthMode: 'fixed', width: '360px' })
    expect(withSizeValue({ height: '1px' }, 'height', '')).toEqual({ heightMode: 'fixed' })
  })
})

describe('sizeMarks (16.4)', () => {
  it('стрелки у «Заполнить», скобки с числом у «Фикс.», у «Авто» пусто', () => {
    expect(sizeMarks({ widthMode: 'fill', heightMode: 'fill' })).toBe('↔ ↕')
    expect(sizeMarks({ width: '360px' })).toBe('⊢360px⊣')
    expect(sizeMarks({ heightMode: 'fixed' })).toBe('⊤⊥')
    expect(sizeMarks({})).toBe('')
  })
})
