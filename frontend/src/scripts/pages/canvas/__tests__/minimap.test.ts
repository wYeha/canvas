/** Тесты minimap: вписывание корней и видимой области с сохранением пропорций и обратный перевод клика в точку поля. */
import { describe, expect, it } from 'vitest'
import { minimapLayout, minimapToWorld } from '@/scripts/pages/canvas/minimap'

describe('minimapLayout', () => {
  const size = { width: 200, height: 120 }
  const root = { x: 0, y: 0, width: 1000, height: 500 }
  const view = { x: 0, y: 0, width: 500, height: 250 }

  it('масштаб по большей стороне с полями 8, рамка по центру', () => {
    const layout = minimapLayout([root], view, size)
    expect(layout.scale).toBeCloseTo((200 - 16) / 1000)
    const [mapped] = layout.roots
    expect(mapped?.x).toBeCloseTo(8)
    // По высоте рамка центрирована: (120 - 500 × 0,184) / 2
    expect(mapped?.y).toBeCloseTo((120 - 500 * layout.scale) / 2)
    expect(layout.view.width).toBeCloseTo(500 * layout.scale)
  })

  it('видимая область за пределами корней расширяет рамку', () => {
    const far = { x: 3000, y: 0, width: 500, height: 250 }
    expect(minimapLayout([root], far, size).scale).toBeCloseTo((200 - 16) / 3500)
  })

  it('клик по мини-карте — та же точка поля', () => {
    const layout = minimapLayout([root], view, size)
    const mapped = layout.roots[0]
    if (!mapped) throw new Error('нет корня')
    const point = minimapToWorld(layout, { x: mapped.x + mapped.width / 2, y: mapped.y + mapped.height / 2 })
    expect(point.x).toBeCloseTo(500)
    expect(point.y).toBeCloseTo(250)
  })
})
