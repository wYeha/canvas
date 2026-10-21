/**
 * Чистая логика честного переполнения на канвасе (16.4): по каким осям блок обрезается (фиксированный размер с числом,
 * корень с фиксированной высотой превью), сколько детей вылезает за рамку и текст бейджа «+N скрыто ↓». Без DOM и Vue.
 */
import type { ContainerKind, LayoutNode } from '@shared'
import { OVERFLOW_AXIS_ARROWS, OVERFLOW_BADGE_SUFFIX, OVERFLOW_EDGE_EPSILON } from './constants'
import { sizeMode, sizeValue, type SizeAxis } from './size-mode'

/** Оси обрезки блока: по ширине (`x`) и высоте (`y`). */
export interface ClipAxes {
  x: boolean
  y: boolean
}

/** Ось переполнения для бейджа и метки у края. */
export type OverflowAxis = 'x' | 'y'

/** Прямоугольник ребёнка в координатах раскладки родителя (offset*). */
export interface ChildBox {
  left: number
  top: number
  width: number
  height: number
}

/** Переполнение блока: сколько детей не помещается и вдоль какой оси (если по обеим — по высоте). */
export interface NodeOverflow {
  count: number
  axis: OverflowAxis
}

/** Ось обрезки — ось размера: у «Фикс.» с числом блок не растёт по содержимому. Ось прокрутки не режем — она прокручивается. */
function clipsAxis(node: LayoutNode, axis: SizeAxis, scroll: 'x' | 'y'): boolean {
  if (node.container.scroll === scroll) return false
  return sizeMode(node.self, axis) === 'fixed' && sizeValue(node.self, axis) !== null
}

/**
 * Оси обрезки в превью. Вложенный блок — по осям «Фикс.» с числом; корень — по высоте, если у превью фиксированная
 * высота (`rootFixedHeight`). Без детей обрезать нечего.
 */
export function clipAxes(node: LayoutNode, parentKind: ContainerKind | null, rootFixedHeight: boolean): ClipAxes {
  if (node.children.length === 0) return { x: false, y: false }
  if (parentKind === null) return { x: false, y: rootFixedHeight && node.container.scroll !== 'y' }
  return { x: clipsAxis(node, 'width', 'x'), y: clipsAxis(node, 'height', 'y') }
}

/** Вылезает ли ребёнок за рамку `box` по оси обрезки (с допуском на дробные пиксели). */
function exceeds(child: ChildBox, box: { width: number; height: number }, axis: OverflowAxis): boolean {
  if (axis === 'y') return child.top + child.height > box.height + OVERFLOW_EDGE_EPSILON
  return child.left + child.width > box.width + OVERFLOW_EDGE_EPSILON
}

/**
 * Переполнение блока размером `box` (без рамки, с отступом) с прямыми детьми `children`: дети, которые хотя бы частью
 * за краем по одной из осей обрезки. Ничего не вылезает — `null`.
 */
export function measureOverflow(
  box: { width: number; height: number },
  children: readonly ChildBox[],
  axes: ClipAxes,
): NodeOverflow | null {
  const overY = axes.y ? children.filter((child) => exceeds(child, box, 'y')) : []
  const overX = axes.x ? children.filter((child) => exceeds(child, box, 'x') && !overY.includes(child)) : []
  const count = overY.length + overX.length
  if (count === 0) return null
  return { count, axis: overY.length > 0 ? 'y' : 'x' }
}

/** Текст бейджа: `+3 скрыто ↓` (по ширине — `→`). */
export function overflowBadgeText(overflow: NodeOverflow): string {
  return `+${String(overflow.count)}${OVERFLOW_BADGE_SUFFIX}${OVERFLOW_AXIS_ARROWS[overflow.axis]}`
}
