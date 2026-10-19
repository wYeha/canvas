/** Тест демо-документа: проходит parseDocument, три корня с нужными ширинами, KPI и графики подключены связями. */
import { describe, expect, it } from 'vitest'
import { buildLinkIndex, parseDocument } from '@shared'
import { createDemoDocument } from '@/scripts/pages/canvas/demo-document'

describe('demo-document', () => {
  it('проходит parseDocument', () => {
    const result = parseDocument(createDemoDocument())
    expect(result.ok).toBe(true)
  })

  it('три корня: Дашборд 1440, KPI-карточка 240, Карточка графика 480', () => {
    const roots = createDemoDocument().roots
    expect(roots.map((r) => [r.node.label, r.canvas.width])).toEqual([
      ['Дашборд', 1440],
      ['KPI-карточка', 240],
      ['Карточка графика', 480],
    ])
  })

  it('KPI-карточка и карточка графика подключены в дашборд связями', () => {
    const doc = createDemoDocument()
    const [, kpi, chart] = doc.roots
    const sources = buildLinkIndex(doc).placements.map((placement) => placement.sourceId)
    expect(sources).toEqual([kpi?.node.id, chart?.node.id, chart?.node.id])
  })
})
