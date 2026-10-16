/**
 * Чистая геометрия линии вставки при перетаскивании: по прямоугольникам детей и индексу `0..n`
 * даёт сегмент полосы в client-координатах (как у `flexInsertIndex` / `gridInsertIndex`).
 * Без Vue, Pinia и DOM.
 */

import type { FlexContainer } from '@shared'
import type { Rect } from '@/scripts/pages/canvas/camera'
import { DROP_INSERT_LINE_WIDTH } from '@/scripts/pages/canvas/constants'
import { flexFlow, flexLinesForInsert, type Axis, type FlowLine } from './flex-insert'

/** Контейнер приёмника для расчёта линии. */
export type InsertLineContainer =
  { kind: 'flex'; direction: FlexContainer['direction']; wrap: boolean } | { kind: 'grid' }

/** Вход расчёта линии вставки; координаты — client (как у замера детей). */
export interface InsertLineInput {
  container: InsertLineContainer
  /** Прямоугольники детей в порядке документа; `null` — не отрисован. */
  rects: readonly (Rect | null)[]
  /** Позиция вставки `0..rects.length`. */
  index: number
  /** DOM-индекс перетаскиваемого ребёнка в `rects`; его прямоугольник не участвует (как у `flexInsertIndex`). */
  skip?: number | null
  /** Прямоугольник приёмника на странице — для пустого контейнера и краёв без соседей. */
  parentRect?: Rect | null
  /** Толщина полосы, client px. */
  thickness?: number
}

/** Отрезок прямоугольника вдоль оси. */
function span(rect: Rect, axis: Axis): [number, number] {
  return axis === 'x' ? [rect.x, rect.x + rect.width] : [rect.y, rect.y + rect.height]
}

/** Середина отрезка. */
function mid(a: number, b: number): number {
  return (a + b) / 2
}

/** Прямоугольник полосы: центр по главной оси, полный отрезок по поперечной. */
function bar(main: Axis, mainPos: number, crossStart: number, crossEnd: number, thickness: number): Rect {
  const half = thickness / 2
  const mainStart = mainPos - half
  if (main === 'x') {
    return { x: mainStart, y: crossStart, width: thickness, height: Math.max(crossEnd - crossStart, thickness) }
  }
  return { x: crossStart, y: mainStart, width: Math.max(crossEnd - crossStart, thickness), height: thickness }
}

/** Поперечная ось к главной. */
function crossOf(axis: Axis): Axis {
  return axis === 'x' ? 'y' : 'x'
}

/** Объединение прямоугольников детей; `null`, если ни одного. */
function unionRects(rects: readonly (Rect | null)[]): Rect | null {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const rect of rects) {
    if (rect === null) continue
    left = Math.min(left, rect.x)
    top = Math.min(top, rect.y)
    right = Math.max(right, rect.x + rect.width)
    bottom = Math.max(bottom, rect.y + rect.height)
  }
  if (!Number.isFinite(left)) return null
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Рамка для краевых случаев: приёмник или объединение детей. */
function bounds(rects: readonly (Rect | null)[], parentRect: Rect | null | undefined): Rect | null {
  if (parentRect !== null && parentRect !== undefined && parentRect.width + parentRect.height > 0) return parentRect
  return unionRects(rects)
}

/** Прямоугольник ребёнка; `skip` — перетаскиваемый, его след в DOM не учитываем. */
function childRect(rects: readonly (Rect | null)[], index: number, skip: number | null): Rect | null {
  if (index === skip) return null
  return rects[index] ?? null
}

/** Первый не-null прямоугольник с индекса `from` вверх (без `skip`). */
function firstRectFrom(rects: readonly (Rect | null)[], from: number, skip: number | null = null): Rect | null {
  for (let i = from; i < rects.length; i += 1) {
    const rect = childRect(rects, i, skip)
    if (rect != null) return rect
  }
  return null
}

/** Последний не-null прямоугольник до индекса `before` (не включая; без `skip`). */
function lastRectBefore(rects: readonly (Rect | null)[], before: number, skip: number | null = null): Rect | null {
  for (let i = before - 1; i >= 0; i -= 1) {
    const rect = childRect(rects, i, skip)
    if (rect != null) return rect
  }
  return null
}

/** Линия flex, в которой лежит ребёнок с DOM-индексом; `undefined`, если ребёнка нет в линиях. */
function lineOfDomIndex(lines: FlowLine[], domIndex: number): FlowLine | undefined {
  return lines.find((line) => line.items.some((item) => item.index === domIndex))
}

/** Поперечные границы линии flex или пары соседних прямоугольников. */
function crossSpan(line: FlowLine | undefined, left: Rect | null, right: Rect | null, cross: Axis): [number, number] {
  if (line !== undefined) return [line.crossStart, line.crossEnd]
  const parts: number[] = []
  if (left !== null) parts.push(...span(left, cross))
  if (right !== null) parts.push(...span(right, cross))
  if (parts.length === 0) return [0, 0]
  return [Math.min(...parts), Math.max(...parts)]
}

/** Линия в начале потока flex. */
function flexInsertLineAtStart(
  input: InsertLineInput,
  main: Axis,
  cross: Axis,
  lines: FlowLine[],
  box: Rect | null,
  thickness: number,
  skip: number | null,
): Rect {
  const first = firstRectFrom(input.rects, 0, skip)
  const firstDom = first === null ? -1 : input.rects.indexOf(first)
  const line = firstDom < 0 ? undefined : lineOfDomIndex(lines, firstDom)
  const [crossStart, crossEnd] = first === null && box !== null ? span(box, cross) : crossSpan(line, null, first, cross)
  const mainPos = first === null && box !== null ? mid(...span(box, main)) : first === null ? 0 : span(first, main)[0]
  const edge = first === null && box !== null ? mid(...span(box, main)) : mainPos
  const pos = first === null ? edge : mid(box !== null ? span(box, main)[0] : mainPos, span(first, main)[0])
  return bar(main, pos, crossStart, crossEnd, thickness)
}

/** Линия в конце потока flex. */
function flexInsertLineAtEnd(
  input: InsertLineInput,
  main: Axis,
  cross: Axis,
  lines: FlowLine[],
  box: Rect | null,
  thickness: number,
  skip: number | null,
): Rect {
  const n = input.rects.length
  const last = lastRectBefore(input.rects, n, skip)
  const domIndex = last === null ? n - 1 : input.rects.lastIndexOf(last)
  const line = last === null ? lines.at(-1) : lineOfDomIndex(lines, domIndex)
  const [crossStart, crossEnd] = last === null && box !== null ? span(box, cross) : crossSpan(line, last, null, cross)
  const mainEnd = last === null && box !== null ? span(box, main)[1] : last === null ? 0 : span(last, main)[1]
  const pos =
    last === null && box !== null ? mid(...span(box, main)) : mid(mainEnd, box !== null ? span(box, main)[1] : mainEnd)
  return bar(main, pos, crossStart, crossEnd, thickness)
}

/** Линия между соседями во flex (в одной линии или между линиями при wrap). */
function flexInsertLineBetween(
  input: InsertLineInput,
  main: Axis,
  cross: Axis,
  lines: FlowLine[],
  box: Rect | null,
  thickness: number,
  skip: number | null,
): Rect {
  const n = input.rects.length
  const index = input.index
  const left = lastRectBefore(input.rects, index, skip)
  const right = firstRectFrom(input.rects, index, skip)
  const leftDom = left === null ? -1 : input.rects.indexOf(left)
  const rightDom = right === null ? n : input.rects.indexOf(right)
  const lineLeft = leftDom >= 0 ? lineOfDomIndex(lines, leftDom) : undefined
  const lineRight = rightDom < n ? lineOfDomIndex(lines, rightDom) : undefined
  const sameLine = lineLeft !== undefined && lineLeft === lineRight

  if (sameLine || (lineLeft === undefined && lineRight === undefined)) {
    const line = lineLeft ?? lineRight
    const [crossStart, crossEnd] = crossSpan(line, left, right, cross)
    const leftEnd = left === null ? (box !== null ? span(box, main)[0] : 0) : span(left, main)[1]
    const rightStart = right === null ? (box !== null ? span(box, main)[1] : leftEnd) : span(right, main)[0]
    return bar(main, mid(leftEnd, rightStart), crossStart, crossEnd, thickness)
  }

  const [crossStart, crossEnd] = crossSpan(undefined, left, right, cross)
  const leftEnd = left === null ? crossStart : span(left, cross)[1]
  const rightStart = right === null ? crossEnd : span(right, cross)[0]
  const crossPos = mid(leftEnd, rightStart)
  const mainParts: number[] = []
  if (left !== null) mainParts.push(...span(left, main))
  if (right !== null) mainParts.push(...span(right, main))
  if (box !== null) mainParts.push(...span(box, main))
  const mainStart = Math.min(...mainParts)
  const mainEnd = Math.max(...mainParts)
  return bar(cross, crossPos, mainStart, mainEnd, thickness)
}

/** Линия вставки во flex-контейнер. */
function flexInsertLineRect(input: InsertLineInput): Rect | null {
  const thickness = input.thickness ?? DROP_INSERT_LINE_WIDTH
  const skip = input.skip ?? null
  const { direction, wrap } = input.container as Extract<InsertLineContainer, { kind: 'flex' }>
  const flow = flexFlow(direction)
  const main = flow.main
  const cross = crossOf(main)
  const lines = flexLinesForInsert(input.rects, direction, wrap, skip)
  const box = bounds(input.rects, input.parentRect)
  const index = input.index
  const n = input.rects.length

  if (index <= 0) return flexInsertLineAtStart(input, main, cross, lines, box, thickness, skip)
  if (index >= n) return flexInsertLineAtEnd(input, main, cross, lines, box, thickness, skip)
  return flexInsertLineBetween(input, main, cross, lines, box, thickness, skip)
}

/** Линия вставки в grid-контейнер (поток по X). */
function gridInsertLineRect(input: InsertLineInput): Rect | null {
  const thickness = input.thickness ?? DROP_INSERT_LINE_WIDTH
  const skip = input.skip ?? null
  const main: Axis = 'x'
  const cross: Axis = 'y'
  const box = bounds(input.rects, input.parentRect)
  const index = input.index
  const n = input.rects.length

  if (index <= 0) {
    const first = firstRectFrom(input.rects, 0, skip)
    const [crossStart, crossEnd] =
      first === null && box !== null ? span(box, cross) : crossSpan(undefined, null, first, cross)
    const pos =
      first === null && box !== null
        ? mid(...span(box, main))
        : first === null
          ? 0
          : mid(box !== null ? span(box, main)[0] : 0, span(first, main)[0])
    return bar(main, pos, crossStart, crossEnd, thickness)
  }

  if (index >= n) {
    const last = lastRectBefore(input.rects, n, skip)
    const [crossStart, crossEnd] =
      last === null && box !== null ? span(box, cross) : crossSpan(undefined, last, null, cross)
    const pos =
      last === null && box !== null
        ? mid(...span(box, main))
        : mid(
            last === null ? 0 : span(last, main)[1],
            box !== null ? span(box, main)[1] : last === null ? 0 : span(last, main)[1],
          )
    return bar(main, pos, crossStart, crossEnd, thickness)
  }

  const left = lastRectBefore(input.rects, index, skip)
  const right = firstRectFrom(input.rects, index, skip)
  const [crossStart, crossEnd] = crossSpan(undefined, left, right, cross)
  const leftEnd = left === null ? (box !== null ? span(box, main)[0] : 0) : span(left, main)[1]
  const rightStart = right === null ? (box !== null ? span(box, main)[1] : leftEnd) : span(right, main)[0]
  return bar(main, mid(leftEnd, rightStart), crossStart, crossEnd, thickness)
}

/**
 * Прямоугольник полосы линии вставки в client-координатах; `null`, если построить нельзя.
 */
export function insertLineRect(input: InsertLineInput): Rect | null {
  const { index, rects } = input
  if (index < 0 || index > rects.length) return null
  if (input.container.kind === 'grid') return gridInsertLineRect(input)
  return flexInsertLineRect(input)
}
