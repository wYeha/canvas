/** Тесты node-view: цвет по глубине, значки, пустой лист, подпись корня, стиль положения корня, копии повтора, вид связи. */
import { describe, expect, it } from 'vitest'
import { REPEAT_RENDER_BUDGET } from '@/scripts/pages/canvas/constants'
import { createBlock, createLinkBlock, createRootEntry } from '@/scripts/pages/canvas/factories'
import {
  blockClasses,
  depthClass,
  directionIcon,
  linkSourceName,
  needsLeafMinHeight,
  paletteIndex,
  renderChildren,
  repeatCount,
  repeatMark,
  rootCaption,
  rootLabelMap,
  rootPlacementStyle,
} from '@/scripts/pages/canvas/node-view'
import { makeDoc } from './tree-fixture'

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
    expect(repeatMark(rep('a', 4), 'x')).toBe('x4')
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

describe('бюджет копий повтора', () => {
  /** Блок с id, повтором и детьми. */
  function rep(id: string, repeat: number, children: ReturnType<typeof createBlock>[] = []) {
    return { ...createBlock('flex', id), id, repeat, children }
  }

  /** Считает, сколько блоков нарисуют вложенные компоненты: обход как у `CanvasNode` (пропсы `copyOf`/`budget` от родителя). */
  function drawn(children: ReturnType<typeof createBlock>[], copyOf: string | null, budget: number) {
    let total = 0
    let copies = 0
    for (const item of renderChildren(children, copyOf, budget)) {
      total += 1
      if (item.copyOf !== null) copies += 1
      // Тень копии рисуется без содержимого
      const inner = item.shadow ? { total: 0, copies: 0 } : drawn(item.node.children, item.copyOf, item.budget)
      total += inner.total
      copies += inner.copies
    }
    return { total, copies }
  }

  it('копии — тени (16.5), исходные блоки — нет', () => {
    const items = renderChildren([rep('x', 3)], null)
    expect(items.map((item) => item.shadow)).toEqual([false, true, true])
  })

  it('сверх бюджета копии не рисуются, исходные блоки — всегда', () => {
    const items = renderChildren([rep('x', 24), rep('y', 1)], null, 5)
    expect(items.map((item) => item.key)).toEqual(['x', 'x#1', 'x#2', 'x#3', 'x#4', 'x#5', 'y'])
    expect(renderChildren([rep('x', 24)], null, 0).map((item) => item.key)).toEqual(['x'])
  })

  it('бюджет по умолчанию — REPEAT_RENDER_BUDGET', () => {
    expect(renderChildren([rep('x', 24)], null)).toHaveLength(24)
    const many = renderChildren([rep('x', 24), rep('y', 24), rep('z', 24)], null)
    expect(many.filter((item) => item.copyOf !== null)).toHaveLength(69)
  })

  it('вложенные 24 × 24 × 24: копий не больше бюджета, все исходные блоки на месте', () => {
    const tree = [rep('a', 24, [rep('b', 24, [rep('c', 24)])])]
    const { copies, total } = drawn(tree, null, REPEAT_RENDER_BUDGET)
    expect(copies).toBeLessThanOrEqual(REPEAT_RENDER_BUDGET)
    expect(total).toBeLessThan(24 * 24 * 24)
    expect(total).toBeGreaterThanOrEqual(3)
  })

  it('поддерево настоящего блока получает остаток после братьев и своих копий', () => {
    const tree = [rep('a', 3, [rep('b', 2)]), rep('c', 2)]
    const items = renderChildren(tree, null, 10)
    // a: поддерево тратит 1 (копия b), копии a — тени по 1 блоку; c получает остаток
    expect(items.map((item) => [item.key, item.budget])).toEqual([
      ['a', 10],
      ['a#1', 0],
      ['a#2', 0],
      ['c', 10 - 1 - 1 - 1],
      ['c#1', 0],
    ])
  })

  it('функция чистая: вход не меняется, результат повторяем', () => {
    const tree = [rep('a', 4, [rep('b', 4)])]
    const before = JSON.stringify(tree)
    expect(renderChildren(tree, null, 7)).toEqual(renderChildren(tree, null, 7))
    expect(JSON.stringify(tree)).toBe(before)
  })
})

describe('связь', () => {
  const link = { ...createLinkBlock('C'), id: 'l' }

  it('значок ⇢, класс плашки, лист с редакторским min-height', () => {
    expect(directionIcon(link)).toBe('⇢')
    expect(blockClasses(link, 2, 'flex')).toEqual(
      expect.arrayContaining(['canvas-node', 'canvas-node--link', 'canvas-node--leaf', 'canvas-node--min-height']),
    )
  })

  it('подписи корней и имя источника', () => {
    const doc = makeDoc()
    const labels = rootLabelMap(doc)
    expect(labels.get('B')).toBe('B')
    expect(linkSourceName('B', labels)).toBe('B')
    expect(linkSourceName('nope', labels)).toBe('источник не найден')
  })
})
