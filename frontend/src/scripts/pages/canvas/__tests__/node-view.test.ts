/** Тесты node-view: цвет по глубине, значки, пустой лист, подпись корня, стиль положения корня, копии повтора. */
import { describe, expect, it } from 'vitest'
import { createBlock, createRootEntry } from '@/scripts/pages/canvas/factories'
import {
  blockClasses,
  depthClass,
  directionIcon,
  needsLeafMinHeight,
  paletteIndex,
  renderChildren,
  repeatCount,
  repeatMark,
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

  it('подпись корня и стиль положения', () => {
    const root = createRootEntry('flex', 'Дашборд', { x: 10, y: 20 }, 1440)
    expect(rootCaption(root.node, root.canvas)).toBe('Дашборд · 1440')
    expect(rootCaption({ ...root.node, label: ' ' }, root.canvas)).toBe('Без подписи · 1440')
    expect(rootPlacementStyle(root.canvas)).toEqual({ left: '10px', top: '20px', width: '1440px' })
    expect(rootPlacementStyle({ ...root.canvas, height: 300 })['height']).toBe('300px')
  })
})

describe('повтор ×N', () => {
  /** Блок с id и числом повторов. */
  function rep(id: string, repeat: number, children: ReturnType<typeof createBlock>[] = []) {
    return { ...createBlock('flex', id), id, repeat, children }
  }

  it('repeatCount: целое в пределах 1…24, мусор — 1', () => {
    expect(repeatCount(rep('a', 1))).toBe(1)
    expect(repeatCount(rep('a', 3))).toBe(3)
    expect(repeatCount(rep('a', 2.7))).toBe(2)
    expect(repeatCount(rep('a', 1000))).toBe(24)
    expect(repeatCount(rep('a', 0))).toBe(1)
    expect(repeatCount(rep('a', Number.NaN))).toBe(1)
  })

  it('repeatMark: ×N только при repeat > 1', () => {
    expect(repeatMark(rep('a', 1))).toBe('')
    expect(repeatMark(rep('a', 4))).toBe('×4')
  })

  it('renderChildren: за блоком его N − 1 копий, ключи уникальны, копии ссылаются на исходный блок', () => {
    const items = renderChildren([rep('x', 3), rep('y', 1)], null)
    expect(items.map((item) => [item.key, item.copyOf, item.copyRoot])).toEqual([
      ['x', null, false],
      ['x#1', 'x', true],
      ['x#2', 'x', true],
      ['y', null, false],
    ])
    expect(items[1]?.node).toBe(items[0]?.node)
  })

  it('renderChildren внутри копии: всё относится к исходному блоку копии, приглушение не повторяется', () => {
    const items = renderChildren([rep('inner', 2), rep('z', 1)], 'outer')
    expect(items.map((item) => [item.key, item.copyOf, item.copyRoot])).toEqual([
      ['inner', 'outer', false],
      ['inner#1', 'outer', false],
      ['z', 'outer', false],
    ])
  })
})
