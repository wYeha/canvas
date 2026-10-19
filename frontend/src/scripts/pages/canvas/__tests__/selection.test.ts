/** Тесты selection: клик или перетаскивание, цель клика, навигация Esc/Enter, прямоугольники и тексты оверлея, путь. */
import { describe, expect, it } from 'vitest'
import { matchSelectionHotkey } from '@/scripts/pages/canvas/camera-input'
import { CLICK_DRAG_THRESHOLD } from '@/scripts/pages/canvas/constants'
import {
  breadcrumbSegments,
  firstChildSelection,
  isBadgeInside,
  rectContains,
  isClickGesture,
  nodeTypeLabel,
  overlayRectStyle,
  parentSelection,
  resolveClickTarget,
  selectionBadgeText,
  sizeText,
  toLocalRect,
  toWorldRect,
  visibleHoverId,
} from '@/scripts/pages/canvas/selection'
import { findNode, getPath } from '@/scripts/pages/canvas/tree-query'
import { makeDoc } from './tree-fixture'

const doc = makeDoc()

/** Находит узел, который обязан существовать в фикстуре. */
function node(id: string) {
  const found = findNode(doc, id)
  if (found === undefined) throw new Error(id)
  return found
}

describe('selection: клик и цель', () => {
  it('сдвиг в пределах порога — клик, больше — перетаскивание', () => {
    const start = { x: 10, y: 10 }
    expect(isClickGesture(start, { x: 10, y: 10 }, CLICK_DRAG_THRESHOLD)).toBe(true)
    expect(isClickGesture(start, { x: 13, y: 14 }, CLICK_DRAG_THRESHOLD)).toBe(false)
    expect(isClickGesture(start, { x: 12, y: 12 }, CLICK_DRAG_THRESHOLD)).toBe(true)
  })

  it('цель клика: существующий id или null', () => {
    expect(resolveClickTarget(doc, 'a1x')).toBe('a1x')
    expect(resolveClickTarget(doc, 'a3')).toBe('a3')
    expect(resolveClickTarget(doc, 'нет')).toBeNull()
    expect(resolveClickTarget(doc, null)).toBeNull()
  })

  it('наведение не показывается поверх выделенного', () => {
    expect(visibleHoverId('a1', 'a1')).toBeNull()
    expect(visibleHoverId('a1', 'a2')).toBe('a1')
    expect(visibleHoverId(null, 'a2')).toBeNull()
  })
})

describe('selection: навигация', () => {
  it('Esc: к родителю, с корня и без выделения — снять', () => {
    expect(parentSelection(doc, 'a1x')).toBe('a1')
    expect(parentSelection(doc, 'a1')).toBe('A')
    expect(parentSelection(doc, 'a3')).toBe('A')
    expect(parentSelection(doc, 'A')).toBeNull()
    expect(parentSelection(doc, null)).toBeNull()
  })

  it('Enter: к первому ребёнку; лист остаётся', () => {
    expect(firstChildSelection(doc, 'A')).toBe('a1')
    expect(firstChildSelection(doc, 'a1')).toBe('a1x')
    expect(firstChildSelection(doc, 'a2')).toBe('a2')
    expect(firstChildSelection(doc, 'a3')).toBe('a3')
    expect(firstChildSelection(doc, null)).toBeNull()
  })

  it('хоткеи Esc и Enter только без модификаторов', () => {
    /** Событие клавиши с заданным кодом и модификаторами. */
    const key = (code: string, extra = {}) => ({
      code,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      ...extra,
    })
    expect(matchSelectionHotkey(key('Escape'))).toBe('select-parent')
    expect(matchSelectionHotkey(key('Enter'))).toBe('select-child')
    expect(matchSelectionHotkey(key('NumpadEnter'))).toBe('select-child')
    expect(matchSelectionHotkey(key('Enter', { shiftKey: true }))).toBeNull()
    expect(matchSelectionHotkey(key('Escape', { ctrlKey: true }))).toBeNull()
    expect(matchSelectionHotkey(key('KeyA'))).toBeNull()
  })
})

describe('selection: геометрия и тексты', () => {
  it('локальный прямоугольник — минус начало оверлея', () => {
    const rect = toLocalRect({ x: 300, y: 200, width: 50, height: 40 }, { x: 100, y: 44, width: 0, height: 0 })
    expect(rect).toEqual({ x: 200, y: 156, width: 50, height: 40 })
  })

  it('прямоугольник в координатах поля: минус начало поля и деление на зум', () => {
    const rect = toWorldRect({ x: 300, y: 200, width: 100, height: 60 }, { x: 100, y: 0 }, 2)
    expect(rect).toEqual({ x: 100, y: 100, width: 50, height: 30 })
  })

  it('размер Ш×В делится на зум и округляется', () => {
    expect(sizeText({ x: 0, y: 0, width: 720, height: 450 }, 0.5)).toBe('1440×900')
    expect(sizeText({ x: 0, y: 0, width: 100.4, height: 33.3 }, 1)).toBe('100×33')
  })

  it('бейдж: подпись · тип · размер', () => {
    expect(selectionBadgeText(node('a1'), '10×20')).toBe('a1 · grid · 10×20')
    expect(selectionBadgeText({ ...node('a3'), label: '' }, '1×2')).toBe('Без подписи · flex · 1×2')
    expect(nodeTypeLabel(node('A'))).toBe('flex')
  })

  it('бейдж уходит внутрь у верхнего края', () => {
    expect(isBadgeInside({ x: 0, y: 5, width: 1, height: 1 })).toBe(true)
    expect(isBadgeInside({ x: 0, y: 50, width: 1, height: 1 })).toBe(false)
  })

  it('стиль рамки оверлея в px', () => {
    expect(overlayRectStyle({ x: 1, y: 2, width: 3, height: 4 })).toEqual({
      left: '1px',
      top: '2px',
      width: '3px',
      height: '4px',
    })
  })

  it('плашка пути: сегменты от корня до выделенного', () => {
    const segments = breadcrumbSegments(getPath(doc, 'a1x'))
    expect(segments.map((s) => s.id)).toEqual(['A', 'a1', 'a1x'])
    expect(segments.map((s) => s.text)).toEqual(['A', 'a1', 'a1x'])
    expect(breadcrumbSegments([])).toEqual([])
  })
})

describe('rectContains', () => {
  it('границы включительно, снаружи — false', () => {
    const rect = { x: 10, y: 10, width: 20, height: 10 }
    expect(rectContains(rect, { x: 10, y: 10 })).toBe(true)
    expect(rectContains(rect, { x: 30, y: 20 })).toBe(true)
    expect(rectContains(rect, { x: 31, y: 15 })).toBe(false)
    expect(rectContains(rect, { x: 15, y: 9 })).toBe(false)
  })
})
