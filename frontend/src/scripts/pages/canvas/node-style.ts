/**
 * Единственный источник раскладочных стилей узла: чистые функции для превью и экспорта, только отличия от CSS по
 * умолчанию. Режимы размера (по содержимому / заполнить / фиксированный) превращаются в flex, растяжение и минимумы.
 */
import type { Container, ContainerKind, FlexContainer, GridContainer, LayoutNode, ScrollAxis, SelfProps } from '@shared'
import {
  CSS_DEFAULT_ALIGN,
  CSS_DEFAULT_FLEX,
  CSS_DEFAULT_FLEX_DIRECTION,
  CSS_DEFAULT_GRID_ROWS,
  CSS_DEFAULT_JUSTIFY_CONTENT,
  CSS_DISPLAY_FLEX,
  CSS_DISPLAY_GRID,
  CSS_FLEX_WRAP,
  CSS_GRID_SPAN,
  CSS_FLEX_FILL,
  CSS_FLEX_NONE,
  CSS_MIN_SPAN,
  CSS_MIN_ZERO,
  CSS_OVERFLOW_AUTO,
  CSS_POSITION_ANCHOR,
  POSITION_STYLE_ENTRIES,
  SCROLL_OVERFLOW_PROPERTY,
  SCROLL_SIZE_AXIS,
  CSS_STRETCH,
  GAP_VAR_PREFIX,
  MIN_CHILDREN_FOR_GAP,
  INLINE_STYLE_SEPARATOR,
} from './constants'
import { repeatCount } from './node-view'
import { isOverlayChild } from './position'
import { mainAxis, otherAxis, sizeMode, sizeValue, type SizeAxis } from './size-mode'

/** Оси размера в порядке вывода. */
const SIZE_AXES: readonly SizeAxis[] = ['width', 'height']

/** Одно CSS-свойство: имя в kebab-case и значение. */
export type StyleEntry = readonly [property: string, value: string]

/** Последовательность пробельных символов: в `flex` схлопывается до одного пробела перед сравнением. */
const WHITESPACE_RUN = /\s+/g

/** `flex` пуст или равен значению CSS по умолчанию `0 1 auto` (без учёта регистра и лишних пробелов). */
export function isDefaultFlex(value: string | undefined): boolean {
  const text = (value ?? '').trim().replace(WHITESPACE_RUN, ' ').toLowerCase()
  return text === '' || text === CSS_DEFAULT_FLEX
}

/** Обрезает строку; пустая после trim превращается в `null`. */
function clean(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

/** Добавляет свойство, если значение задано. */
function push(entries: StyleEntry[], property: string, value: string | null): void {
  if (value !== null) entries.push([property, value])
}

/**
 * Зазор токеном через CSS-переменную (`var(--gap-m)`): определения — в редакторе на слое поля, в экспорте у верхнего
 * элемента вывода. Только при двух детях и больше: у листа и единственного ребёнка зазор ничего не делает (шум).
 */
function gapEntries(container: Container, childCount: number): StyleEntry[] {
  if (container.gap === undefined || childCount < MIN_CHILDREN_FOR_GAP) return []
  return [['gap', `var(${GAP_VAR_PREFIX}${container.gap})`]]
}

/** Стили flex-контейнера: display, direction, wrap, justify, align, gap. */
function flexEntries(container: FlexContainer, childCount: number): StyleEntry[] {
  const entries: StyleEntry[] = [['display', CSS_DISPLAY_FLEX]]
  if (container.direction !== CSS_DEFAULT_FLEX_DIRECTION) entries.push(['flex-direction', container.direction])
  if (container.wrap) entries.push(['flex-wrap', CSS_FLEX_WRAP])
  if (container.justify !== CSS_DEFAULT_JUSTIFY_CONTENT) entries.push(['justify-content', container.justify])
  if (container.align !== CSS_DEFAULT_ALIGN) entries.push(['align-items', container.align])
  return [...entries, ...gapEntries(container, childCount)]
}

/** Стили grid-контейнера: display, шаблоны, выравнивание. */
function gridEntries(container: GridContainer, childCount: number): StyleEntry[] {
  const entries: StyleEntry[] = [['display', CSS_DISPLAY_GRID]]
  push(entries, 'grid-template-columns', clean(container.columns))
  const rows = clean(container.rows)
  if (rows !== CSS_DEFAULT_GRID_ROWS) push(entries, 'grid-template-rows', rows)
  if (container.justifyItems !== CSS_DEFAULT_ALIGN) entries.push(['justify-items', container.justifyItems])
  if (container.alignItems !== CSS_DEFAULT_ALIGN) entries.push(['align-items', container.alignItems])
  return [...entries, ...gapEntries(container, childCount)]
}

/** `flex` ребёнка flex-родителя: свободное значение (не по умолчанию) важнее режима главной оси. */
function childFlex(self: SelfProps, main: SizeAxis): string | null {
  if (!isDefaultFlex(self.flex)) return clean(self.flex)?.replace(WHITESPACE_RUN, ' ') ?? null
  const mode = sizeMode(self, main)
  if (mode === 'fill') return CSS_FLEX_FILL
  return mode === 'fixed' ? CSS_FLEX_NONE : null
}

/** Числа фиксированных осей: `width`, `height`. */
function fixedSizeEntries(self: SelfProps): StyleEntry[] {
  const entries: StyleEntry[] = []
  for (const axis of SIZE_AXES) if (sizeMode(self, axis) === 'fixed') push(entries, axis, sizeValue(self, axis))
  return entries
}

/**
 * Минимумы и максимумы: заданные явно; у «Заполнить» по главной оси flex-родителя минимум по ней — 0
 * (иначе длинное содержимое распирает блок и ломает раскладку), если он не задан.
 */
function limitEntries(self: SelfProps, zeroAxes: readonly SizeAxis[]): StyleEntry[] {
  const entries: StyleEntry[] = []
  push(entries, 'min-width', clean(self.minWidth) ?? (zeroAxes.includes('width') ? CSS_MIN_ZERO : null))
  push(entries, 'max-width', clean(self.maxWidth))
  push(entries, 'min-height', clean(self.minHeight) ?? (zeroAxes.includes('height') ? CSS_MIN_ZERO : null))
  return entries
}

/**
 * Ось размера, по которой блок прокручивается и «Заполняет» родителя: ей тоже нужен минимум 0 — иначе цепочка
 * растягивающихся предков вырастет по содержимому и прокрутки не будет. `null`, если такой оси нет.
 */
function scrollFillAxis(self: SelfProps, scroll: ScrollAxis | undefined): SizeAxis | null {
  if (scroll === undefined) return null
  const axis = SCROLL_SIZE_AXIS[scroll]
  return sizeMode(self, axis) === 'fill' ? axis : null
}

/** Положение ребёнка: прилипание к краю (`position:sticky`) или угол родителя (`position:absolute`). */
function positionEntries(self: SelfProps): StyleEntry[] {
  return self.position === undefined ? [] : [...POSITION_STYLE_ENTRIES[self.position]]
}

/**
 * `position:relative` у блока, внутри которого есть дети поверх него: иначе их углы отсчитываются от далёкого предка.
 * Не нужен, если блок сам уже позиционирован (прилипает или лежит поверх своего родителя).
 */
function anchorEntries(node: LayoutNode, parentKind: ContainerKind | null): StyleEntry[] {
  if (!node.children.some(isOverlayChild)) return []
  if (parentKind !== null && node.self.position !== undefined) return []
  return [['position', CSS_POSITION_ANCHOR]]
}

/** Прокрутка содержимого блока: `overflow-y:auto` или `overflow-x:auto` (у корня тоже). */
function scrollEntries(scroll: ScrollAxis | undefined): StyleEntry[] {
  return scroll === undefined ? [] : [[SCROLL_OVERFLOW_PROPERTY[scroll], CSS_OVERFLOW_AUTO]]
}

/** «Как ребёнок» во flex-родителе с направлением `direction`: flex по главной оси, растяжение по поперечной. */
function flexChildEntries(
  self: SelfProps,
  direction: FlexContainer['direction'],
  zeroAxis: SizeAxis | null,
): StyleEntry[] {
  const main = mainAxis(direction)
  const entries: StyleEntry[] = []
  push(entries, 'flex', childFlex(self, main))
  entries.push(...fixedSizeEntries(self))
  if (sizeMode(self, otherAxis(main)) === 'fill') entries.push(['align-self', CSS_STRETCH])
  const fillMain = isDefaultFlex(self.flex) && sizeMode(self, main) === 'fill' ? main : null
  const zeroAxes = [fillMain, zeroAxis].filter((axis): axis is SizeAxis => axis !== null)
  return [...entries, ...limitEntries(self, zeroAxes)]
}

/** «Как ребёнок» в grid-родителе: span, числа, растяжение в ячейке по осям «Заполнить». */
function gridChildEntries(self: SelfProps, zeroAxis: SizeAxis | null): StyleEntry[] {
  const entries: StyleEntry[] = []
  if (self.colSpan !== undefined && self.colSpan > CSS_MIN_SPAN) {
    entries.push(['grid-column', `${CSS_GRID_SPAN} ${String(self.colSpan)}`])
  }
  if (self.rowSpan !== undefined && self.rowSpan > CSS_MIN_SPAN) {
    entries.push(['grid-row', `${CSS_GRID_SPAN} ${String(self.rowSpan)}`])
  }
  entries.push(...fixedSizeEntries(self))
  if (sizeMode(self, 'width') === 'fill') entries.push(['justify-self', CSS_STRETCH])
  if (sizeMode(self, 'height') === 'fill') entries.push(['align-self', CSS_STRETCH])
  return [...entries, ...limitEntries(self, zeroAxis === null ? [] : [zeroAxis])]
}

/**
 * Стили «как ребёнок»; для корня (`parentKind === null`) ничего. Порядок стабильный: flex или span, числа размеров,
 * растяжение, минимумы и максимумы (у старых документов без режимов вывод прежний: flex, width, height, min-height).
 */
function selfEntries(
  node: LayoutNode,
  parentKind: ContainerKind | null,
  direction: FlexContainer['direction'],
): StyleEntry[] {
  if (parentKind === null) return []
  const zeroAxis = scrollFillAxis(node.self, node.container.scroll)
  const entries =
    parentKind === 'flex' ? flexChildEntries(node.self, direction, zeroAxis) : gridChildEntries(node.self, zeroAxis)
  return [...entries, ...positionEntries(node.self)]
}

/** Контейнерная часть стилей блока (display, flex/grid-свойства, gap при `childCount` ≥ 2); в `styleEntries` она всегда первая. */
export function containerEntries(container: Container, childCount = 0): StyleEntry[] {
  return container.kind === 'flex' ? flexEntries(container, childCount) : gridEntries(container, childCount)
}

/**
 * Стили узла в стабильном порядке (контейнер, опора для детей поверх, «как ребёнок» с положением, прокрутка); `parentKind` — вид контейнера родителя (`null` у корня), `parentDirection` —
 * направление flex-родителя (главная ось для режимов размера; по умолчанию row).
 * Внутреннего отступа здесь нет: в редакторе он фиксированный и задаётся классом, в экспорт не идёт.
 */
export function styleEntries(
  node: LayoutNode,
  parentKind: ContainerKind | null,
  parentDirection: FlexContainer['direction'] = CSS_DEFAULT_FLEX_DIRECTION,
): StyleEntry[] {
  const entries = containerEntries(node.container, renderedChildCount(node))
  entries.push(
    ...anchorEntries(node, parentKind),
    ...selfEntries(node, parentKind, parentDirection),
    ...scrollEntries(node.container.scroll),
  )
  return entries
}

/**
 * Сколько соседей окажется внутри узла с учётом повторов: ребёнок ×4 — четыре соседа. Единственный ребёнок с
 * повтором тоже требует зазора (в превью — копии, в экспорте `data-repeat` разворачивается в соседей).
 */
export function renderedChildCount(node: LayoutNode): number {
  return node.children.reduce((sum, child) => sum + repeatCount(child), 0)
}

/** Объект для Vue `:style` (ключи в kebab-case). */
export function toStyleObject(entries: readonly StyleEntry[]): Record<string, string> {
  return Object.fromEntries(entries)
}

/** Строка инлайн-стиля для экспорта: `display:flex; flex-direction:column`. */
export function toInlineStyle(entries: readonly StyleEntry[]): string {
  return entries.map(([property, value]) => `${property}:${value}`).join(INLINE_STYLE_SEPARATOR)
}
