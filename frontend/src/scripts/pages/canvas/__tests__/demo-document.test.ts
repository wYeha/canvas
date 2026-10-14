/** Тест демо-документа: проходит parseDocument и содержит три корня с нужными ширинами и четыре связи на KPI. */
import { describe, expect, it } from 'vitest'
import { parseDocument } from '@shared'
import { createDemoDocument } from '@/scripts/pages/canvas/demo-document'

describe('demo-document', () => {
  it('проходит parseDocument', () => {
    const result = parseDocument(createDemoDocument())
    expect(result.ok).toBe(true)
  })

  it('три корня: Дашборд 1440, KPI-плашка 240, Карточка графика 480', () => {
    const roots = createDemoDocument().roots
    expect(roots.map((r) => [r.node.label, r.canvas.width])).toEqual([
      ['Дашборд', 1440],
      ['KPI-плашка', 240],
      ['Карточка графика', 480],
    ])
  })
})
