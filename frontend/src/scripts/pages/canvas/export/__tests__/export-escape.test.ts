/** Тесты экранирования экспорта: атрибут style, текст комментариев, однострочные подписи и строки описания. */
import { describe, expect, it } from 'vitest'
import {
  escapeCommentText,
  escapeHtmlAttr,
  toCommentLines,
  toSingleLine,
} from '@/scripts/pages/canvas/export/export-escape'

describe('escapeHtmlAttr', () => {
  it('экранирует & " < > и не задваивает &', () => {
    expect(escapeHtmlAttr('a&b "c" <d>')).toBe('a&amp;b &quot;c&quot; &lt;d&gt;')
    expect(escapeHtmlAttr('&amp;')).toBe('&amp;amp;')
  })

  it('пустая строка остаётся пустой', () => {
    expect(escapeHtmlAttr('')).toBe('')
  })
})

describe('escapeCommentText', () => {
  it('разбивает конец комментария -->', () => {
    expect(escapeCommentText('a --> b')).toBe('a - -> b')
  })

  it('экранирует начало комментария <!--', () => {
    expect(escapeCommentText('<!-- x')).toBe('&lt;!- - x')
  })

  it('разбивает --!>', () => {
    expect(escapeCommentText('--!>')).toBe('- -!>')
  })

  it('три дефиса подряд → - - -', () => {
    expect(escapeCommentText('---')).toBe('- - -')
  })

  it('одиночный дефис не трогает', () => {
    expect(escapeCommentText('kpi-row')).toBe('kpi-row')
    expect(escapeCommentText('-')).toBe('-')
  })

  it('экранирует & и <, но оставляет > и кавычки', () => {
    expect(escapeCommentText('a & b < c > d "e"')).toBe('a &amp; b &lt; c > d "e"')
  })

  it('табы и \\r → пробел, \\n сохраняет', () => {
    expect(escapeCommentText('a\tb\r\nc')).toBe('a b \nc')
  })

  it('результат не содержит последовательностей, ломающих комментарий', () => {
    const result = escapeCommentText('--><script>alert(1)</script><!--')
    expect(result).not.toContain('--')
    expect(result).not.toContain('<')
  })

  it('пустая строка остаётся пустой', () => {
    expect(escapeCommentText('')).toBe('')
  })
})

describe('невидимые символы', () => {
  const invisible = ['\u0080', '\u0085', '\u009F', '\u2028', '\u2029', '\u202A', '\u202E', '\u2066', '\u2069']

  it.each(invisible.map((char) => [char.codePointAt(0)?.toString(16) ?? '', char]))(
    'U+%s заменяется пробелом в комментарии и в подписи',
    (_code, char) => {
      expect(escapeCommentText(`a${char}b`)).toBe('a b')
      expect(toSingleLine(`a${char}b`)).toBe('a b')
    },
  )

  it('bidi и C1 внутри строки описания → пробел', () => {
    expect(toCommentLines('a\u202Eb\u0090c')).toEqual(['a b c'])
  })
})

describe('toSingleLine', () => {
  it('переводы строк и табы → пробел, пробелы схлопнуты, края обрезаны', () => {
    expect(toSingleLine('  a\r\nb\t\tc\n ')).toBe('a b c')
  })

  it('пустая строка остаётся пустой', () => {
    expect(toSingleLine('')).toBe('')
  })
})

describe('toCommentLines', () => {
  it('разбивает по \\r\\n, \\r и \\n', () => {
    expect(toCommentLines('a\r\nb\rc\nd')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('срезает хвостовые пробелы и крайние пустые строки, сохраняет пустые в середине', () => {
    expect(toCommentLines('\n  \n  a  \n\nb\t\n\n')).toEqual(['  a', '', 'b'])
  })

  it('табы внутри строки → пробел', () => {
    expect(toCommentLines('a\tb')).toEqual(['a b'])
  })

  it('NEL, U+2028 и U+2029 — тоже переводы строк', () => {
    expect(toCommentLines('a\u0085b\u2028c\u2029d')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('пустая строка → нет строк', () => {
    expect(toCommentLines('')).toEqual([])
    expect(toCommentLines(' \r\n ')).toEqual([])
  })
})
