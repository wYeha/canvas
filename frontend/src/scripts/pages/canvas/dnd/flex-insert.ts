/**
 * Чистый расчёт позиции вставки во flex-блок при перетаскивании: по прямоугольникам детей и точке указателя
 * даёт индекс в порядке детей документа (как цель `child` у `moveNode`) с учётом направления, reverse и переноса.
 * Без Vue, Pinia и DOM; координаты прямоугольников и точки — в одной системе (любой).
 */

import type { FlexContainer } from '@shared'
import type { Rect } from '@/scripts/pages/canvas/camera'
import { FLEX_LINE_EPSILON } from '@/scripts/pages/canvas/constants'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'

/** Ось на плоскости. */
export type Axis = 'x' | 'y'

/** Главная ось flex-контейнера и обратный ли порядок вдоль неё. */
export interface FlexFlow {
  main: Axis
  reverse: boolean
}

/** Ребёнок flex-контейнера в координатах потока: DOM-индекс, отрезок по главной оси и по поперечной. */
interface FlowItem {
  index: number
  start: number
  end: number
  crossStart: number
  crossEnd: number
}

/** Линия flex-контейнера: элементы в порядке DOM и её границы по поперечной оси. */
interface FlowLine {
  items: FlowItem[]
  crossStart: number
  crossEnd: number
}

/** Вход расчёта позиции вставки во flex-контейнер; координаты прямоугольников и точки — в одной системе. */
export interface FlexInsertInput {
  direction: FlexContainer['direction']
  wrap: boolean
  /** Прямоугольники детей в порядке документа (= DOM); `null` — ребёнок не отрисован. */
  rects: readonly (Rect | null)[]
  pointer: CanvasPoint
  /** Индекс перетаскиваемого ребёнка в этом контейнере; `null` — тянут узел из другого места. */
  skip: number | null
}

/** Главная ось и reverse для каждого `flex-direction`. */
const FLEX_FLOWS: Readonly<Record<FlexContainer['direction'], FlexFlow>> = {
  row: { main: 'x', reverse: false },
  'row-reverse': { main: 'x', reverse: true },
  column: { main: 'y', reverse: false },
  'column-reverse': { main: 'y', reverse: true },
}

/** Главная ось и обратный ли порядок вдоль неё для направления flex-контейнера. */
export function flexFlow(direction: FlexContainer['direction']): FlexFlow {
  return FLEX_FLOWS[direction]
}

/** Поперечная ось к данной. */
function crossOf(axis: Axis): Axis {
  return axis === 'x' ? 'y' : 'x'
}

/** Отрезок прямоугольника вдоль оси: `[начало, конец]`. */
function spanOf(rect: Rect, axis: Axis): [number, number] {
  return axis === 'x' ? [rect.x, rect.x + rect.width] : [rect.y, rect.y + rect.height]
}

/**
 * Координата потока точки: вдоль главной оси в направлении раскладки (при reverse — с обратным знаком).
 * В ней дети каждой линии идут по возрастанию в порядке DOM при любом направлении.
 */
function flowCoord(point: CanvasPoint, flow: FlexFlow): number {
  const value = point[flow.main]
  return flow.reverse ? -value : value
}

/** Дети в координатах потока; не отрисованные (`null`) пропускаются, DOM-индексы остальных сохраняются. */
function toFlowItems(rects: readonly (Rect | null)[], flow: FlexFlow): FlowItem[] {
  const cross = crossOf(flow.main)
  const items: FlowItem[] = []
  rects.forEach((rect, index) => {
    if (rect === null) return
    const [mainStart, mainEnd] = spanOf(rect, flow.main)
    const [crossStart, crossEnd] = spanOf(rect, cross)
    const [start, end] = flow.reverse ? [-mainEnd, -mainStart] : [mainStart, mainEnd]
    items.push({ index, start, end, crossStart, crossEnd })
  })
  return items
}

/** Линия из элементов: поперечные границы — от наименьшего начала до наибольшего конца. */
function makeLine(items: FlowItem[]): FlowLine {
  const crossStart = Math.min(...items.map((item) => item.crossStart))
  const crossEnd = Math.max(...items.map((item) => item.crossEnd))
  return { items, crossStart, crossEnd }
}

/**
 * Разбивает детей на линии. Без переноса — одна линия. С переносом новая линия начинается, когда элемент
 * начинается раньше конца предыдущего по потоку (`start < prev.end − ε`): внутри линии flex кладёт детей подряд,
 * а первый ребёнок новой линии возвращается к началу оси. Поперечную ось не смотрим: при `align-items` не `stretch`
 * дети одной линии стоят на разной высоте. Крайний случай: нулевой ребёнок в начале линии и следующий за ним
 * перенесённый склеиваются в одну линию — допустимо.
 */
function splitLines(items: FlowItem[], wrap: boolean): FlowLine[] {
  if (items.length === 0) return []
  if (!wrap) return [makeLine(items)]
  const groups: FlowItem[][] = []
  let current: FlowItem[] = []
  let prev: FlowItem | null = null
  for (const item of items) {
    if (prev !== null && item.start < prev.end - FLEX_LINE_EPSILON) {
      groups.push(current)
      current = []
    }
    current.push(item)
    prev = item
  }
  groups.push(current)
  return groups.map(makeLine)
}

/**
 * Убирает перетаскиваемого ребёнка из линий (его след не должен делить место «до/после себя»); опустевшие линии
 * удаляются, границы остальных не пересчитываются.
 */
function withoutSkip(lines: FlowLine[], skip: number | null): FlowLine[] {
  if (skip === null) return lines
  return lines
    .map((line) => ({ ...line, items: line.items.filter((item) => item.index !== skip) }))
    .filter((line) => line.items.length > 0)
}

/**
 * Линия под поперечной координатой точки: граница между соседними линиями — середина зазора между ними.
 * Выше первой — первая, ниже последней — последняя; линий нет — `undefined`.
 */
function pickLine(lines: FlowLine[], crossPoint: number): FlowLine | undefined {
  for (let i = 0; i < lines.length - 1; i += 1) {
    const line = lines[i]
    const next = lines[i + 1]
    if (line !== undefined && next !== undefined && crossPoint < (line.crossEnd + next.crossStart) / 2) return line
  }
  return lines.at(-1)
}

/**
 * Место в линии: перед первым ребёнком, середина которого дальше точки по потоку; иначе — после последнего.
 * Ровно на середине — «после» (строгое сравнение).
 */
function indexInLine(line: FlowLine, flowPoint: number): number {
  const before = line.items.find((item) => flowPoint < (item.start + item.end) / 2)
  if (before !== undefined) return before.index
  const last = line.items.at(-1)
  return last === undefined ? 0 : last.index + 1
}

/**
 * Позиция вставки `0..rects.length` в порядке детей документа (как индекс цели `child` у `moveNode`):
 * линия — по поперечной оси, место в линии — по серединам детей вдоль потока (reverse учтён).
 * Перетаскиваемый ребёнок (`skip`) не учитывается: над его следом ответ — `skip` или `skip + 1` («на место»).
 * Нет ни одного учитываемого ребёнка — `rects.length` (пустой контейнер — 0).
 */
export function flexInsertIndex(input: FlexInsertInput): number {
  const flow = flexFlow(input.direction)
  const lines = withoutSkip(splitLines(toFlowItems(input.rects, flow), input.wrap), input.skip)
  const line = pickLine(lines, input.pointer[crossOf(flow.main)])
  return line === undefined ? input.rects.length : indexInLine(line, flowCoord(input.pointer, flow))
}
