/** Тесты position: вид положения, край и угол из одного поля, смена вида с вариантом по умолчанию. */
import { describe, expect, it } from 'vitest'
import { createBlock } from '@/scripts/pages/canvas/factories'
import {
  cornerGlyph,
  isOverlayChild,
  overlayCorner,
  positionForKind,
  positionKind,
  stickySide,
  withPosition,
} from '@/scripts/pages/canvas/position'

describe('position', () => {
  it('вид, край и угол по значению поля', () => {
    expect(positionKind(undefined)).toBe('static')
    expect(positionKind('sticky-bottom')).toBe('sticky')
    expect(positionKind('bottom-left')).toBe('overlay')
    expect(stickySide('sticky-top')).toBe('top')
    expect(stickySide('top-left')).toBeNull()
    expect(overlayCorner('top-left')).toBe('top-left')
    expect(overlayCorner('sticky-top')).toBeNull()
  })

  it('смена вида: тот же — без изменений, другой — вариант по умолчанию, «обычно» — без поля', () => {
    expect(positionForKind('sticky-bottom', 'sticky')).toBe('sticky-bottom')
    expect(positionForKind('bottom-left', 'sticky')).toBe('sticky-top')
    expect(positionForKind(undefined, 'overlay')).toBe('top-right')
    expect(positionForKind('top-left', 'static')).toBeUndefined()
  })

  it('withPosition не мутирует вход и стирает ключ', () => {
    const self = { flex: '0 1 auto', position: 'top-left' as const }
    expect(withPosition(self, undefined)).toEqual({ flex: '0 1 auto' })
    expect(withPosition(self, 'sticky-top')).toEqual({ flex: '0 1 auto', position: 'sticky-top' })
    expect(self.position).toBe('top-left')
  })

  it('ребёнок поверх родителя и значок угла', () => {
    const block = createBlock('flex', 'dot')
    expect(isOverlayChild(block)).toBe(false)
    expect(isOverlayChild({ ...block, self: { position: 'bottom-right' } })).toBe(true)
    expect(isOverlayChild({ ...block, self: { position: 'sticky-top' } })).toBe(false)
    expect(cornerGlyph('top-right')).toBe('↗')
    expect(cornerGlyph('x')).toBe('')
  })
})
