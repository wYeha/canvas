/** Тесты чистой логики UiNumberInput: разбор, шаг, ограничения и фиксация правки. */
import { describe, expect, it } from 'vitest'
import {
  clampNumber,
  formatNumber,
  parseNumberText,
  resolveCommit,
  stepNumber,
} from '@/scripts/components/ui-number-input/number-input'

describe('parseNumberText', () => {
  it('разбирает числа, в том числе с запятой и минусом', () => {
    expect(parseNumberText('12')).toEqual({ kind: 'number', value: 12 })
    expect(parseNumberText(' -1,5 ')).toEqual({ kind: 'number', value: -1.5 })
  })

  it('пустая строка — empty, нечисло — invalid', () => {
    expect(parseNumberText('  ')).toEqual({ kind: 'empty' })
    expect(parseNumberText('abc')).toEqual({ kind: 'invalid' })
    expect(parseNumberText('12px')).toEqual({ kind: 'invalid' })
    expect(parseNumberText('-')).toEqual({ kind: 'invalid' })
  })
})

describe('parseNumberText с единицей поля', () => {
  it('принимает ту же единицу с пробелом и без, отбрасывая её', () => {
    expect(parseNumberText('12px', 'px')).toEqual({ kind: 'number', value: 12 })
    expect(parseNumberText('50 %', '%')).toEqual({ kind: 'number', value: 50 })
    expect(parseNumberText(' 1,5fr ', 'fr')).toEqual({ kind: 'number', value: 1.5 })
  })

  it('чужая единица, одна единица без числа и поле без единицы — нечисло', () => {
    expect(parseNumberText('12%', 'px')).toEqual({ kind: 'invalid' })
    expect(parseNumberText('px', 'px')).toEqual({ kind: 'invalid' })
    expect(parseNumberText('12px')).toEqual({ kind: 'invalid' })
  })

  it('resolveCommit отбрасывает единицу и откатывается на чужой', () => {
    expect(resolveCommit('12px', 5, undefined, undefined, 'px')).toEqual({ value: 12, text: '12' })
    expect(resolveCommit('12%', 5, undefined, undefined, 'px')).toEqual({ value: 5, text: '5' })
  })
})

describe('clampNumber и formatNumber', () => {
  it('ограничивает по границам, если они заданы', () => {
    expect(clampNumber(5, 0, 3)).toBe(3)
    expect(clampNumber(-5, 0, 3)).toBe(0)
    expect(clampNumber(5)).toBe(5)
  })

  it('null форматируется пустой строкой', () => {
    expect(formatNumber(null)).toBe('')
    expect(formatNumber(0)).toBe('0')
  })
})

describe('stepNumber', () => {
  it('шагает на step, с Shift — на ×10', () => {
    expect(stepNumber(10, 1, 1, false)).toBe(11)
    expect(stepNumber(10, -1, 1, true)).toBe(0)
  })

  it('не копит ошибку плавающей точки', () => {
    expect(stepNumber(0.1, 1, 0.1, false)).toBe(0.2)
  })

  it('null считается нулём, результат ограничен min/max', () => {
    expect(stepNumber(null, 1, 1, false)).toBe(1)
    expect(stepNumber(1, -1, 1, true, 0)).toBe(0)
    expect(stepNumber(95, 1, 1, true, 0, 100)).toBe(100)
  })
})

describe('resolveCommit', () => {
  it('пусто → null', () => {
    expect(resolveCommit('', 5)).toEqual({ value: null, text: '' })
  })

  it('nullable=false: пусто откатывается к fallback, число работает как обычно', () => {
    expect(resolveCommit('', 5, undefined, undefined, undefined, false)).toEqual({ value: 5, text: '5' })
    expect(resolveCommit('7', 5, undefined, undefined, undefined, false)).toEqual({ value: 7, text: '7' })
  })

  it('число ограничивается и форматируется', () => {
    expect(resolveCommit('150', 5, 0, 100)).toEqual({ value: 100, text: '100' })
    expect(resolveCommit('2,5', 5)).toEqual({ value: 2.5, text: '2.5' })
  })

  it('нечисло откатывается к последнему корректному значению', () => {
    expect(resolveCommit('abc', 5)).toEqual({ value: 5, text: '5' })
    expect(resolveCommit('abc', null)).toEqual({ value: null, text: '' })
  })
})
