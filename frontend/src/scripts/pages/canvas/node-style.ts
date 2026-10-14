/** Единственный источник раскладочных стилей узла: чистые функции для превью и экспорта, только отличия от CSS по умолчанию. */
import type { Container, ContainerKind, FlexContainer, GridContainer, LayoutNode, Padding, SelfProps } from '@shared'
import {
  CSS_DEFAULT_ALIGN,
  CSS_DEFAULT_FLEX_DIRECTION,
  CSS_DEFAULT_GRID_ROWS,
  CSS_DEFAULT_JUSTIFY_CONTENT,
  CSS_DISPLAY_FLEX,
  CSS_DISPLAY_GRID,
  CSS_FLEX_WRAP,
  CSS_GRID_SPAN,
  CSS_MIN_SPAN,
  CSS_PX_UNIT,
  INLINE_STYLE_SEPARATOR,
} from './constants'

/** Одно CSS-свойство: имя в kebab-case и значение. */
export type StyleEntry = readonly [property: string, value: string]

/** Число px как CSS-значение: `16` → `16px`. */
function px(value: number): string {
  return `${String(value)}${CSS_PX_UNIT}`
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

/** Стили flex-контейнера: display, direction, wrap, justify, align, gap. */
function flexEntries(container: FlexContainer): StyleEntry[] {
  const entries: StyleEntry[] = [['display', CSS_DISPLAY_FLEX]]
  if (container.direction !== CSS_DEFAULT_FLEX_DIRECTION) entries.push(['flex-direction', container.direction])
  if (container.wrap) entries.push(['flex-wrap', CSS_FLEX_WRAP])
  if (container.justify !== CSS_DEFAULT_JUSTIFY_CONTENT) entries.push(['justify-content', container.justify])
  if (container.align !== CSS_DEFAULT_ALIGN) entries.push(['align-items', container.align])
  if (container.gap !== null) entries.push(['gap', px(container.gap)])
  return entries
}

/** Стили gap grid-контейнера: общий `gap`, если зазоры равны, иначе по отдельности. */
function gridGapEntries(container: GridContainer): StyleEntry[] {
  const { columnGap, rowGap } = container
  if (columnGap !== null && columnGap === rowGap) return [['gap', px(columnGap)]]
  const entries: StyleEntry[] = []
  if (columnGap !== null) entries.push(['column-gap', px(columnGap)])
  if (rowGap !== null) entries.push(['row-gap', px(rowGap)])
  return entries
}

/** Стили grid-контейнера: display, шаблоны, выравнивание, gap. */
function gridEntries(container: GridContainer): StyleEntry[] {
  const entries: StyleEntry[] = [['display', CSS_DISPLAY_GRID]]
  push(entries, 'grid-template-columns', clean(container.columns))
  const rows = clean(container.rows)
  if (rows !== CSS_DEFAULT_GRID_ROWS) push(entries, 'grid-template-rows', rows)
  if (container.justifyItems !== CSS_DEFAULT_ALIGN) entries.push(['justify-items', container.justifyItems])
  if (container.alignItems !== CSS_DEFAULT_ALIGN) entries.push(['align-items', container.alignItems])
  entries.push(...gridGapEntries(container))
  return entries
}

/** Сокращённая запись padding: 1, 2 или 4 значения; `null` для отсутствующих и нулевых отступов. */
export function paddingValue(padding: Padding | null): string | null {
  if (padding === null) return null
  const { top, right, bottom, left } = padding
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return null
  if (top === right && right === bottom && bottom === left) return px(top)
  if (top === bottom && left === right) return `${px(top)} ${px(right)}`
  return [top, right, bottom, left].map(px).join(' ')
}

/** Стили «как ребёнок»; для корня (`parentKind === null`) ничего, свойства чужого типа родителя игнорируются. */
function selfEntries(self: SelfProps, parentKind: ContainerKind | null): StyleEntry[] {
  if (parentKind === null) return []
  const entries: StyleEntry[] = []
  if (parentKind === 'flex') {
    push(entries, 'flex', clean(self.flex))
    push(entries, 'width', clean(self.width))
  } else {
    if (self.colSpan !== undefined && self.colSpan > CSS_MIN_SPAN) {
      entries.push(['grid-column', `${CSS_GRID_SPAN} ${String(self.colSpan)}`])
    }
    if (self.rowSpan !== undefined && self.rowSpan > CSS_MIN_SPAN) {
      entries.push(['grid-row', `${CSS_GRID_SPAN} ${String(self.rowSpan)}`])
    }
  }
  push(entries, 'height', clean(self.height))
  push(entries, 'min-height', clean(self.minHeight))
  return entries
}

/** Контейнерная часть стилей блока (display, flex/grid-свойства, gap); в `styleEntries` она всегда идёт первой. */
export function containerEntries(container: Container): StyleEntry[] {
  return container.kind === 'flex' ? flexEntries(container) : gridEntries(container)
}

/** Стили узла в стабильном порядке; `parentKind` — вид контейнера родителя (`null` у корня). */
export function styleEntries(node: LayoutNode, parentKind: ContainerKind | null): StyleEntry[] {
  if (node.type === 'link') return selfEntries(node.self, parentKind)
  const entries = containerEntries(node.container)
  push(entries, 'padding', paddingValue(node.padding))
  entries.push(...selfEntries(node.self, parentKind))
  return entries
}

/** Объект для Vue `:style` (ключи в kebab-case). */
export function toStyleObject(entries: readonly StyleEntry[]): Record<string, string> {
  return Object.fromEntries(entries)
}

/** Строка инлайн-стиля для экспорта: `display:flex; gap:16px`. */
export function toInlineStyle(entries: readonly StyleEntry[]): string {
  return entries.map(([property, value]) => `${property}:${value}`).join(INLINE_STYLE_SEPARATOR)
}
