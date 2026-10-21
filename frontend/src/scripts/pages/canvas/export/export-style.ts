/** Защита стилей и тегов при экспорте: повторная проверка значений, экранирование атрибута, свойства корня и проверка тега. */
import {
  isSafeCssValue,
  LAYOUT_TAGS,
  type BlockNode,
  type CanvasPlacement,
  type Container,
  type ContainerKind,
  type FlexContainer,
} from '@shared'
import {
  CSS_DEFAULT_GRID_ROWS,
  CSS_PX_UNIT,
  DEFAULT_FLEX,
  DEFAULT_GRID,
  LEAF_ELEMENT_TAGS,
} from '@/scripts/pages/canvas/constants'
import { containerEntries, styleEntries, toInlineStyle, type StyleEntry } from '@/scripts/pages/canvas/node-style'
import { escapeHtmlAttr } from './export-escape'
import {
  EXPORT_CSS_PROPERTY_PATTERN,
  EXPORT_FALLBACK_TAG,
  EXPORT_FULL_SCREEN_HEIGHT,
  EXPORT_REPEAT_ATTR,
  EXPORT_ROOT_MARGIN,
} from './export-constants'

/** Готовое значение атрибута `style` и имена отброшенных свойств. */
export interface SafeStyle {
  style: string
  dropped: string[]
}

/** Проверенный тег и признак замены недопустимого тега. */
export interface SafeTag {
  tag: string
  replaced: boolean
}

/** Контейнер совпадает с умолчанием фабрики по полям модели (пустые rows считаются `auto`). */
function isDefaultContainer(container: Container): boolean {
  if (container.kind === 'flex') {
    return (
      container.direction === DEFAULT_FLEX.direction &&
      container.wrap === DEFAULT_FLEX.wrap &&
      container.justify === DEFAULT_FLEX.justify &&
      container.align === DEFAULT_FLEX.align
    )
  }
  const rows = container.rows.trim()
  return (
    container.columns.trim() === DEFAULT_GRID.columns &&
    (rows === '' || rows === CSS_DEFAULT_GRID_ROWS) &&
    container.justifyItems === DEFAULT_GRID.justifyItems &&
    container.alignItems === DEFAULT_GRID.alignItems
  )
}

/**
 * Стили блока для экспорта: `styleEntries` без контейнерной части (включая `display`) у пустого листа
 * с контейнером по умолчанию — это шум, раскладывать нечего. Иначе — `styleEntries` целиком.
 * Контейнерная часть в `styleEntries` всегда идёт первой, поэтому отрезается по длине `containerEntries`.
 */
export function exportStyleEntries(
  block: BlockNode,
  parentKind: ContainerKind | null,
  parentDirection?: FlexContainer['direction'],
): StyleEntry[] {
  const entries = styleEntries(block, parentKind, parentDirection)
  if (block.children.length > 0 || !isDefaultContainer(block.container)) return entries
  return entries.slice(containerEntries(block.container, block.children.length).length)
}

/**
 * Отбрасывает свойства с недопустимым именем или небезопасным значением (защита в глубину: данные могли
 * прийти в обход zod) и собирает строку `style`, экранированную как HTML-атрибут.
 */
export function safeStyle(entries: readonly StyleEntry[]): SafeStyle {
  const kept: StyleEntry[] = []
  const dropped: string[] = []
  for (const entry of entries) {
    const [property, value] = entry
    if (EXPORT_CSS_PROPERTY_PATTERN.test(property) && isSafeCssValue(value)) kept.push(entry)
    else dropped.push(property)
  }
  return { style: escapeHtmlAttr(toInlineStyle(kept)), dropped }
}

/**
 * Export-only свойства корня: `height:100vh` у корня «экран целиком»; `max-width` по ширине превью и `margin:0 auto`
 * при `exportMaxWidth`.
 */
export function rootExportEntries(placement: CanvasPlacement): StyleEntry[] {
  const entries: StyleEntry[] = placement.fullScreen === true ? [['height', EXPORT_FULL_SCREEN_HEIGHT]] : []
  if (!placement.exportMaxWidth) return entries
  return [...entries, ['max-width', `${String(placement.width)}${CSS_PX_UNIT}`], ['margin', EXPORT_ROOT_MARGIN]]
}

/** Тег из `LAYOUT_TAGS` или смысловой элемент листа из `LEAF_ELEMENT_TAGS` остаётся, любой другой заменяется на `div`. */
export function safeTag(tag: string): SafeTag {
  const allowed: readonly string[] = LAYOUT_TAGS
  const ok = allowed.includes(tag) || LEAF_ELEMENT_TAGS.has(tag)
  return ok ? { tag, replaced: false } : { tag: EXPORT_FALLBACK_TAG, replaced: true }
}

/**
 * Открывающий тег: `data-repeat="N"` у повторяемого элемента (N > 1 — машиночитаемо, что элемент повторяется целиком
 * N раз соседями) и `style`, только если строка стиля непуста (уже экранирована `safeStyle`).
 */
export function openTag(tag: string, style: string, repeat = 1): string {
  const repeatAttr = repeat > 1 ? ` ${EXPORT_REPEAT_ATTR}="${String(repeat)}"` : ''
  const styleAttr = style === '' ? '' : ` style="${style}"`
  return `<${tag}${repeatAttr}${styleAttr}>`
}

/** Закрывающий тег. */
export function closeTag(tag: string): string {
  return `</${tag}>`
}
