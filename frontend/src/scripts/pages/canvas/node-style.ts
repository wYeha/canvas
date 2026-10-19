/** Единственный источник раскладочных стилей узла: чистые функции для превью и экспорта, только отличия от CSS по умолчанию. */
import type { Container, ContainerKind, FlexContainer, GridContainer, LayoutNode, SelfProps } from '@shared'
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
  CSS_MIN_SPAN,
  INLINE_STYLE_SEPARATOR,
} from './constants'

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

/** Стили flex-контейнера: display, direction, wrap, justify, align (gap в модели нет — он только редакторский, BEM-классом). */
function flexEntries(container: FlexContainer): StyleEntry[] {
  const entries: StyleEntry[] = [['display', CSS_DISPLAY_FLEX]]
  if (container.direction !== CSS_DEFAULT_FLEX_DIRECTION) entries.push(['flex-direction', container.direction])
  if (container.wrap) entries.push(['flex-wrap', CSS_FLEX_WRAP])
  if (container.justify !== CSS_DEFAULT_JUSTIFY_CONTENT) entries.push(['justify-content', container.justify])
  if (container.align !== CSS_DEFAULT_ALIGN) entries.push(['align-items', container.align])
  return entries
}

/** Стили grid-контейнера: display, шаблоны, выравнивание. */
function gridEntries(container: GridContainer): StyleEntry[] {
  const entries: StyleEntry[] = [['display', CSS_DISPLAY_GRID]]
  push(entries, 'grid-template-columns', clean(container.columns))
  const rows = clean(container.rows)
  if (rows !== CSS_DEFAULT_GRID_ROWS) push(entries, 'grid-template-rows', rows)
  if (container.justifyItems !== CSS_DEFAULT_ALIGN) entries.push(['justify-items', container.justifyItems])
  if (container.alignItems !== CSS_DEFAULT_ALIGN) entries.push(['align-items', container.alignItems])
  return entries
}

/** Стили «как ребёнок»; для корня (`parentKind === null`) ничего, свойства чужого типа родителя игнорируются. */
function selfEntries(self: SelfProps, parentKind: ContainerKind | null): StyleEntry[] {
  if (parentKind === null) return []
  const entries: StyleEntry[] = []
  if (parentKind === 'flex') {
    if (!isDefaultFlex(self.flex)) push(entries, 'flex', clean(self.flex)?.replace(WHITESPACE_RUN, ' ') ?? null)
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

/** Контейнерная часть стилей блока (display, flex/grid-свойства); в `styleEntries` она всегда идёт первой. */
export function containerEntries(container: Container): StyleEntry[] {
  return container.kind === 'flex' ? flexEntries(container) : gridEntries(container)
}

/**
 * Стили узла в стабильном порядке; `parentKind` — вид контейнера родителя (`null` у корня).
 * Внутреннего отступа здесь нет: в редакторе он фиксированный и задаётся классом, в экспорт не идёт.
 */
export function styleEntries(node: LayoutNode, parentKind: ContainerKind | null): StyleEntry[] {
  const entries = containerEntries(node.container)
  entries.push(...selfEntries(node.self, parentKind))
  return entries
}

/** Объект для Vue `:style` (ключи в kebab-case). */
export function toStyleObject(entries: readonly StyleEntry[]): Record<string, string> {
  return Object.fromEntries(entries)
}

/** Строка инлайн-стиля для экспорта: `display:flex; flex-direction:column`. */
export function toInlineStyle(entries: readonly StyleEntry[]): string {
  return entries.map(([property, value]) => `${property}:${value}`).join(INLINE_STYLE_SEPARATOR)
}
