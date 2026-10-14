/** Тесты файла экспорта: обёртка в HTML-документ, имя файла, статистика. */
import { describe, expect, it } from 'vitest'
import {
  exportFileName,
  formatExportStats,
  formatSize,
  sanitizeFileName,
  wrapHtmlDocument,
} from '@/scripts/pages/canvas/export/export-file'
import { block, docOf, root } from './export-fixture'

/** Управляющий символ SOH: задаём числом, чтобы не зависеть от экранирования в исходнике. */
const CONTROL_CHAR = String.fromCharCode(1)

describe('wrapHtmlDocument', () => {
  it('оборачивает текст, отступает на уровень, пустые строки не трогает, заголовок экранирован', () => {
    const html = wrapHtmlDocument('<!-- a -->\n\n<div></div>\n', 'A <b> & "c"')
    expect(html).toBe(
      [
        '<!DOCTYPE html>',
        '<html lang="ru">',
        '<head>',
        '  <meta charset="utf-8">',
        '  <title>A &lt;b&gt; &amp; &quot;c&quot;</title>',
        '</head>',
        '<body>',
        '  <!-- a -->',
        '',
        '  <div></div>',
        '</body>',
        '</html>',
        '',
      ].join('\n'),
    )
  })
})

describe('имя файла', () => {
  const doc = docOf(root(block('flex', 'Шапка / меню'), 100, null, false))
  const id = doc.roots[0]?.node.id ?? ''

  it('санитизация', () => {
    expect(sanitizeFileName(`a/b:c*d?e"f<g>h|i${CONTROL_CHAR}`)).toBe('a-b-c-d-e-f-g-h-i-')
    expect(sanitizeFileName('  ..  ')).toBe('')
  })

  it('все и отмеченные — имя документа', () => {
    expect(exportFileName('Лендинг', { kind: 'all' }, doc)).toBe('Лендинг.html')
    expect(exportFileName('Лендинг', { kind: 'roots', rootIds: [id] }, doc)).toBe('Лендинг.html')
  })

  it('выделенный — документ и подпись блока', () => {
    expect(exportFileName('Лендинг', { kind: 'selected', nodeId: id }, doc)).toBe('Лендинг — Шапка - меню.html')
  })

  it('пустое имя → layout', () => {
    expect(exportFileName('', { kind: 'all' }, doc)).toBe('layout.html')
  })
})

describe('статистика', () => {
  it('строки и размер', () => {
    expect(formatExportStats('')).toEqual({ lines: 0, size: '0 Б' })
    expect(formatExportStats('a\nb\n')).toEqual({ lines: 2, size: '4 Б' })
    expect(formatExportStats('я\n')).toEqual({ lines: 1, size: '3 Б' })
  })

  it('размер: байты, КБ с запятой, МБ', () => {
    expect(formatSize(840)).toBe('840 Б')
    expect(formatSize(1229)).toBe('1,2 КБ')
    expect(formatSize(2 * 1024 * 1024)).toBe('2,0 МБ')
  })
})
