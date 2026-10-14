/** Тесты node-view: цвет по глубине, значки, пустой лист, подписи корня и связи, стиль положения корня. */
import { describe, expect, it } from 'vitest'
import { createBlock, createDocument, createLink, createRootEntry } from '@/scripts/pages/canvas/factories'
import {
  blockClasses,
  depthClass,
  directionIcon,
  linkCaption,
  needsLeafMinHeight,
  paletteIndex,
  rootCaption,
  rootPlacementStyle,
} from '@/scripts/pages/canvas/node-view'

describe('node-view', () => {
  it('цвет по глубине циклически: depth % 8', () => {
    expect(paletteIndex(0)).toBe(0)
    expect(paletteIndex(7)).toBe(7)
    expect(paletteIndex(8)).toBe(0)
    expect(depthClass(10)).toBe('canvas-node--depth-2')
  })

  it('значок направления: flex по direction, grid — #', () => {
    const row = createBlock('flex', 'a')
    expect(directionIcon(row)).toBe('→')
    if (row.container.kind === 'flex') {
      expect(directionIcon({ ...row, container: { ...row.container, direction: 'column' } })).toBe('↓')
      expect(directionIcon({ ...row, container: { ...row.container, direction: 'row-reverse' } })).toBe('←')
      expect(directionIcon({ ...row, container: { ...row.container, direction: 'column-reverse' } })).toBe('↑')
    }
    expect(directionIcon(createBlock('grid', 'g'))).toBe('#')
  })

  it('min-height только у пустого листа без заданной высоты', () => {
    const leaf = createBlock('flex', 'a')
    expect(needsLeafMinHeight(leaf, 'flex')).toBe(true)
    expect(needsLeafMinHeight({ ...leaf, self: { height: '100px' } }, 'flex')).toBe(false)
    expect(needsLeafMinHeight({ ...leaf, self: { minHeight: '10px' } }, 'grid')).toBe(false)
    expect(needsLeafMinHeight({ ...leaf, self: { height: '100px' } }, null)).toBe(true)
    expect(needsLeafMinHeight({ ...leaf, children: [createBlock('flex', 'b')] }, 'flex')).toBe(false)
  })

  it('классы блока: база, глубина, лист, min-height', () => {
    const leaf = createBlock('flex', 'a')
    expect(blockClasses(leaf, 9, 'flex')).toEqual([
      'canvas-node',
      'canvas-node--depth-1',
      'canvas-node--leaf',
      'canvas-node--min-height',
    ])
    expect(blockClasses({ ...leaf, children: [leaf] }, 0, null)).toEqual(['canvas-node', 'canvas-node--depth-0'])
  })

  it('подпись плашки связи: по подписи источника, с запасным текстом', () => {
    const doc = { ...createDocument(), roots: [createRootEntry('flex', 'KPI', { x: 0, y: 0 })] }
    const id = doc.roots[0]?.node.id ?? ''
    expect(linkCaption(doc, createLink(id).sourceId)).toBe('→ KPI')
    expect(linkCaption(doc, 'нет')).toBe('→ без источника')
  })

  it('подпись корня и стиль положения', () => {
    const root = createRootEntry('flex', 'Дашборд', { x: 10, y: 20 }, 1440)
    expect(rootCaption(root.node, root.canvas)).toBe('Дашборд · 1440')
    expect(rootCaption({ ...root.node, label: ' ' }, root.canvas)).toBe('Без подписи · 1440')
    expect(rootPlacementStyle(root.canvas)).toEqual({ left: '10px', top: '20px', width: '1440px' })
    expect(rootPlacementStyle({ ...root.canvas, height: 300 })['height']).toBe('300px')
  })
})
