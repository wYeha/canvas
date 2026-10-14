/** Тесты подсветки: склейка токенов равна исходному тексту, виды токенов, многострочный комментарий, промпт. */
import { describe, expect, it } from 'vitest'
import { createDemoDocument } from '@/scripts/pages/canvas/demo-document'
import { highlightCode } from '@/scripts/pages/canvas/export/export-highlight'
import { exportScopeHtml } from '@/scripts/pages/canvas/export/export-scope'

/** Склеивает строки подсветки обратно в текст (с завершающим переводом строки). */
function joinLines(text: string): string {
  const lines = highlightCode(text, 'code')
  return `${lines.map((line) => line.tokens.map((t) => t.text).join('')).join('\n')}\n`
}

describe('highlightCode', () => {
  it('склейка токенов даёт исходный текст (демо, все корни)', () => {
    const text = exportScopeHtml(createDemoDocument(), { kind: 'all' }, {})
    expect(text.length).toBeGreaterThan(100)
    expect(joinLines(text)).toBe(text)
  })

  it('виды токенов на эталонной строке', () => {
    const [line] = highlightCode('<div style="display:flex"><!-- logo --></div>\n', 'code')
    expect(line?.number).toBe(1)
    expect(line?.tokens).toEqual([
      { kind: 'tag', text: '<div' },
      { kind: 'text', text: ' ' },
      { kind: 'attr', text: 'style' },
      { kind: 'punct', text: '=' },
      { kind: 'string', text: '"display:flex"' },
      { kind: 'tag', text: '>' },
      { kind: 'comment', text: '<!-- logo -->' },
      { kind: 'tag', text: '</div' },
      { kind: 'tag', text: '>' },
    ])
  })

  it('многострочный комментарий окрашивает все свои строки; пустые строки без токенов; нет лишней строки в конце', () => {
    const lines = highlightCode('<!-- a\n  b\n-->\n\n<p></p>\n', 'code')
    expect(lines.map((l) => l.number)).toEqual([1, 2, 3, 4, 5])
    expect(lines.slice(0, 3).every((l) => l.tokens.every((t) => t.kind === 'comment'))).toBe(true)
    expect(lines[3]?.tokens).toEqual([])
  })

  it('промпт целиком одним видом', () => {
    const lines = highlightCode('<!-- a\n  <b> -->\n', 'prompt')
    expect(lines).toHaveLength(2)
    expect(lines.flatMap((l) => l.tokens).every((t) => t.kind === 'prompt')).toBe(true)
  })

  it('пустой текст — нет строк', () => {
    expect(highlightCode('', 'code')).toEqual([])
  })
})
