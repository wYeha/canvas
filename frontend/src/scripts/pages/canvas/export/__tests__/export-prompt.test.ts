/** Тесты шаблона промпта: разбор сохранённого значения и вставка перед кодом. */
import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPORT_PROMPT, resolvePrompt, withPrompt } from '@/scripts/pages/canvas/export/export-prompt'

describe('resolvePrompt', () => {
  it('строка берётся как есть, в том числе пустая', () => {
    expect(resolvePrompt('мой')).toBe('мой')
    expect(resolvePrompt('')).toBe('')
  })

  it('не строка → умолчание', () => {
    expect(resolvePrompt(null)).toBe(DEFAULT_EXPORT_PROMPT)
    expect(resolvePrompt(5)).toBe(DEFAULT_EXPORT_PROMPT)
  })
})

describe('withPrompt', () => {
  const code = '<div></div>\n'

  it('однострочный промпт — комментарий, пустая строка, код', () => {
    expect(withPrompt('привет', code)).toBe('<!-- привет -->\n\n<div></div>\n')
  })

  it('многострочный промпт — многострочный комментарий', () => {
    expect(withPrompt('a\nb', code)).toBe('<!--\n  a\n  b\n-->\n\n<div></div>\n')
  })

  it('экранирует закрытие комментария', () => {
    const out = withPrompt('x --> <b>', code)
    expect(out.split('\n')[0]).toBe('<!-- x - -> &lt;b> -->')
  })

  it('пустой промпт → только код, пустой код → пустая строка', () => {
    expect(withPrompt('', code)).toBe(code)
    expect(withPrompt('привет', '')).toBe('')
  })

  it('умолчание из DESIGN выводится одной строкой', () => {
    expect(withPrompt(DEFAULT_EXPORT_PROMPT, code).startsWith('<!-- Сверстай по этому каркасу.')).toBe(true)
  })
})
