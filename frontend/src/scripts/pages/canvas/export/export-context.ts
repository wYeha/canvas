/**
 * Комментарий-контекст для экспорта вложенного блока: из какого корня он взят, путь, раскладка родителя
 * и размер блока в нём по двум осям (с шириной из замера превью, если он передан). Чистые функции.
 */
import {
  isSafeCssValue,
  type BlockNode,
  type FlexContainer,
  type GridContainer,
  type LayoutDocument,
  type LayoutNode,
  type NodeId,
  type RootEntry,
  type SelfProps,
} from '@shared'
import {
  BLOCK_PADDING_PX,
  CSS_DEFAULT_ALIGN,
  CSS_DEFAULT_GRID_ROWS,
  CSS_DEFAULT_JUSTIFY_CONTENT,
  CSS_FLEX_WRAP,
  CSS_GRID_SPAN,
  CSS_MIN_SPAN,
  ROOT_UNTITLED_LABEL,
} from '@/scripts/pages/canvas/constants'
import { repeatMark } from '@/scripts/pages/canvas/node-view'
import { isDefaultFlex } from '@/scripts/pages/canvas/node-style'
import { countGridColumns } from '@/scripts/pages/canvas/props-child'
import { getPath, locateNode } from '@/scripts/pages/canvas/tree-query'
import { formatComment, quoted, rootSizeText } from './export-comment'
import { toSingleLine } from './export-escape'
import { safeTag } from './export-style'
import type { ExportOptions } from './export-types'
import {
  EXPORT_CONTEXT_AXIS_SEPARATOR,
  EXPORT_CONTEXT_BY_CONTENT,
  EXPORT_CONTEXT_BY_ROW_CONTENT,
  EXPORT_CONTEXT_COLUMN_ACCUSATIVE_FORMS,
  EXPORT_CONTEXT_COLUMN_FORMS,
  EXPORT_CONTEXT_COLUMN_GENITIVE_FORMS,
  EXPORT_CONTEXT_COLUMNS,
  EXPORT_CONTEXT_COLUMNS_UNKNOWN,
  EXPORT_CONTEXT_CSS,
  EXPORT_CONTEXT_FRAGMENT,
  EXPORT_CONTEXT_GRID_ROW_HEIGHT,
  EXPORT_CONTEXT_HEIGHT_LABEL,
  EXPORT_CONTEXT_MEASURED_SHARE,
  EXPORT_CONTEXT_MEASURED_WIDTH,
  EXPORT_CONTEXT_OCCUPIES,
  EXPORT_CONTEXT_PARENT,
  EXPORT_CONTEXT_PATH,
  EXPORT_CONTEXT_PATH_SEPARATOR,
  EXPORT_CONTEXT_PLACE,
  EXPORT_CONTEXT_PLACE_SEPARATOR,
  EXPORT_CONTEXT_POSITION,
  EXPORT_CONTEXT_REPEATED,
  EXPORT_CONTEXT_ROW_ACCUSATIVE_FORMS,
  EXPORT_CONTEXT_ROW_GENITIVE_FORMS,
  EXPORT_CONTEXT_ROWS,
  EXPORT_CONTEXT_ROWS_UNKNOWN,
  EXPORT_CONTEXT_STRETCH_HEIGHT,
  EXPORT_CONTEXT_STRETCH_LINE_HEIGHT,
  EXPORT_CONTEXT_STRETCH_LINE_WIDTH,
  EXPORT_CONTEXT_STRETCH_WIDTH,
  EXPORT_CONTEXT_WIDTH_LABEL,
  EXPORT_CONTEXT_WITHIN,
  EXPORT_LIST_SEPARATOR,
  EXPORT_PERCENT,
  EXPORT_PLURAL_LOCALE,
  EXPORT_REPEAT_MARK,
  EXPORT_WORD_SEPARATOR,
} from './export-constants'

/** Вложенный узел с родителем и корнем, из которого он взят. */
interface NodePlace {
  entry: RootEntry
  path: readonly LayoutNode[]
  node: LayoutNode
  parent: BlockNode
  index: number
}

/** Описание размера узла по двум осям (без замера). */
interface AxisTexts {
  width: string
  height: string
}

/** Формы слова по категориям `Intl.PluralRules('ru')`. */
type PluralForms = Readonly<Record<'one' | 'few' | 'many', string>>

/** Правила числа для русского языка: `one` (1, 21), `few` (2–4, 22), `many` (5–20, 25). */
const RU_PLURAL = new Intl.PluralRules(EXPORT_PLURAL_LOCALE)

/** Короткое имя для названий CSS-свойств в описаниях. */
const CSS = EXPORT_CONTEXT_CSS

/** Однострочная подпись блока; пустая → «Без подписи». */
function blockLabel(block: BlockNode): string {
  const label = toSingleLine(block.label)
  return label === '' ? ROOT_UNTITLED_LABEL : label
}

/** Свойство и значение через пробел: `justify-content center`. */
function named(property: string, value: string): string {
  return `${property}${EXPORT_WORD_SEPARATOR}${value}`
}

/** Склеивает непустые части через разделитель. */
function joinParts(parts: readonly string[], separator: string): string {
  return parts.filter((part) => part !== '').join(separator)
}

/** Непустые части через запятую или запасной текст, если частей нет. */
function partsOr(parts: readonly string[], fallback: string): string {
  const text = joinParts(parts, EXPORT_LIST_SEPARATOR)
  return text === '' ? fallback : text
}

/** Форма слова по числу: 1 колонка, 2 колонки, 5 колонок, 21 колонка. */
function pluralWord(count: number, forms: PluralForms): string {
  const category = RU_PLURAL.select(count)
  return forms[category === 'one' || category === 'few' ? category : 'many']
}

/** Находит вложенный узел, его родителя, индекс и корень; `undefined` для корня и отсутствующего узла. */
function locatePlace(doc: LayoutDocument, nodeId: NodeId): NodePlace | undefined {
  const loc = locateNode(doc, nodeId)
  const entry = loc ? doc.roots[loc.rootIndex] : undefined
  const index = loc?.indices.at(-1)
  const path = getPath(doc, nodeId)
  const node = path.at(-1)
  const parent = path.at(-2)
  if (!entry || index === undefined || !node || !parent) return undefined
  return { entry, path, node, parent, index }
}

/** Первая строка: `Фрагмент корневого блока «Дашборд» (ширина превью 1440px)`. */
function rootLine(entry: RootEntry): string {
  return `${EXPORT_CONTEXT_FRAGMENT} ${quoted(blockLabel(entry.node))} (${rootSizeText(entry)})`
}

/** Путь от корня до узла: `Путь: Дашборд › body › main › charts`. */
function pathLine(path: readonly LayoutNode[]): string {
  const labels = path.map((node) => blockLabel(node))
  return `${EXPORT_CONTEXT_PATH} ${labels.join(EXPORT_CONTEXT_PATH_SEPARATOR)}`
}

/** Раскладка flex-родителя без значений по умолчанию: `flex column, wrap, justify-content center`. */
function flexLayoutParts(container: FlexContainer): string[] {
  const parts = [named(CSS.flex, container.direction)]
  if (container.wrap) parts.push(CSS_FLEX_WRAP)
  if (container.justify !== CSS_DEFAULT_JUSTIFY_CONTENT) parts.push(named(CSS.justifyContent, container.justify))
  if (container.align !== CSS_DEFAULT_ALIGN) parts.push(named(CSS.alignItems, container.align))
  return parts
}

/**
 * Колонки grid-родителя: `колонки «repeat(2, 1fr)» (2 колонки)`. Небезопасный шаблон (данные в обход zod)
 * не выводится и не разбирается — `колонки не указаны`.
 */
function columnsPart(template: string): string {
  if (!isSafeCssValue(template)) return EXPORT_CONTEXT_COLUMNS_UNKNOWN
  const columns = toSingleLine(template)
  const count = countGridColumns(columns)
  const countText = count === null ? '' : ` (${String(count)} ${pluralWord(count, EXPORT_CONTEXT_COLUMN_FORMS)})`
  return `${EXPORT_CONTEXT_COLUMNS} ${quoted(columns)}${countText}`
}

/** Строки grid-родителя: `строки «auto 1fr»`; `auto`/пусто — ничего; небезопасный шаблон — `строки не указаны`. */
function rowsPart(template: string): string {
  if (!isSafeCssValue(template)) return EXPORT_CONTEXT_ROWS_UNKNOWN
  const rows = toSingleLine(template)
  return rows === '' || rows === CSS_DEFAULT_GRID_ROWS ? '' : `${EXPORT_CONTEXT_ROWS} ${quoted(rows)}`
}

/** Раскладка grid-родителя: `grid, колонки «…» (2 колонки), строки «…», justify-items center`. */
function gridLayoutParts(container: GridContainer): string[] {
  const parts = [CSS.grid, columnsPart(container.columns), rowsPart(container.rows)]
  if (container.justifyItems !== CSS_DEFAULT_ALIGN) parts.push(named(CSS.justifyItems, container.justifyItems))
  if (container.alignItems !== CSS_DEFAULT_ALIGN) parts.push(named(CSS.alignItems, container.alignItems))
  return parts.filter((part) => part !== '')
}

/** Родитель: `Родитель «main» (div): flex column`. */
function parentLine(parent: BlockNode): string {
  const { container } = parent
  const parts = container.kind === 'flex' ? flexLayoutParts(container) : gridLayoutParts(container)
  const head = `${EXPORT_CONTEXT_PARENT} ${quoted(blockLabel(parent))} (${safeTag(parent.tag).tag})`
  return `${head}: ${parts.join(EXPORT_LIST_SEPARATOR)}`
}

/**
 * Свойство «как ребёнок» в виде `имя:значение`; пустое значение → пустая строка. Небезопасное значение
 * (данные в обход zod) пропускается — так же, как экспорт отбрасывает его из `style`.
 */
function selfPart(property: string, value: string | undefined): string {
  if (value === undefined || !isSafeCssValue(value)) return ''
  const text = toSingleLine(value)
  return text === '' ? '' : `${property}:${text}`
}

/** Текст растяжения по поперечной оси flex: на весь родитель или (при переносе) на свою строку. */
function flexStretchText(isRow: boolean, wrap: boolean): string {
  if (wrap) return isRow ? EXPORT_CONTEXT_STRETCH_LINE_HEIGHT : EXPORT_CONTEXT_STRETCH_LINE_WIDTH
  return isRow ? EXPORT_CONTEXT_STRETCH_HEIGHT : EXPORT_CONTEXT_STRETCH_WIDTH
}

/**
 * Размер по осям во flex-родителе по правилам CSS. Главная ось (ширина у row, высота у column) — `flex`
 * и размер по ней, иначе «по содержимому». Поперечная — заданный размер, иначе при `align-items: stretch`
 * растягивается на родителя (с переносом — на свою строку), иначе по содержимому. `min-height` — к высоте.
 */
function flexAxes(self: SelfProps, parent: FlexContainer): AxisTexts {
  const isRow = parent.direction === 'row' || parent.direction === 'row-reverse'
  const crossFallback =
    parent.align === CSS_DEFAULT_ALIGN ? flexStretchText(isRow, parent.wrap) : EXPORT_CONTEXT_BY_CONTENT
  const flex = isDefaultFlex(self.flex) ? '' : selfPart(CSS.flex, self.flex)
  const width = selfPart(CSS.width, self.width)
  const height = selfPart(CSS.height, self.height)
  const minHeight = selfPart(CSS.minHeight, self.minHeight)
  if (isRow) {
    const cross = height || crossFallback
    return { width: partsOr([flex, width], EXPORT_CONTEXT_BY_CONTENT), height: partsOr([cross, minHeight], cross) }
  }
  const main = partsOr([flex, height], EXPORT_CONTEXT_BY_CONTENT)
  return { width: width || crossFallback, height: partsOr([main, minHeight], main) }
}

/** Хвост span: ` (span 2)` при span > 1, иначе пусто. */
function spanSuffix(span: number): string {
  return span > CSS_MIN_SPAN ? ` (${CSS_GRID_SPAN} ${String(span)})` : ''
}

/** Растянутая ячейка: `занимает 2 колонки (span 2)`, без span — `занимает 1 колонку`. */
function occupiesText(span: number, forms: PluralForms): string {
  return `${EXPORT_CONTEXT_OCCUPIES} ${String(span)} ${pluralWord(span, forms)}${spanSuffix(span)}`
}

/** Не растянутая ячейка: `по содержимому в пределах 2 колонок (span 2)`. */
function withinText(span: number, forms: PluralForms): string {
  return `${EXPORT_CONTEXT_WITHIN} ${String(span)} ${pluralWord(span, forms)}${spanSuffix(span)}`
}

/** Span из модели не меньше 1 (данные в обход zod могут дать 0 или отрицательное). */
function spanOf(value: number | undefined): number {
  return Math.max(value ?? CSS_MIN_SPAN, CSS_MIN_SPAN)
}

/** Строки сетки не заданы явно (`auto`/пусто): высота ячейки по содержимому строки. */
function hasAutoRows(container: GridContainer): boolean {
  if (!isSafeCssValue(container.rows)) return false
  const rows = toSingleLine(container.rows)
  return rows === '' || rows === CSS_DEFAULT_GRID_ROWS
}

/**
 * Высота grid-ячейки: заданная `height` (с span строк); без неё при `align-items` ≠ stretch — по содержимому
 * (в пределах span); иначе span строк, «по содержимому строки» при `auto`-строках или «высота строки сетки».
 */
function gridHeight(self: SelfProps, container: GridContainer): string {
  const rowSpan = spanOf(self.rowSpan)
  const height = selfPart(CSS.height, self.height)
  const span = rowSpan > CSS_MIN_SPAN ? occupiesText(rowSpan, EXPORT_CONTEXT_ROW_ACCUSATIVE_FORMS) : ''
  let base: string
  if (height !== '') base = joinParts([span, height], EXPORT_LIST_SEPARATOR)
  else if (container.alignItems !== CSS_DEFAULT_ALIGN) {
    base = rowSpan > CSS_MIN_SPAN ? withinText(rowSpan, EXPORT_CONTEXT_ROW_GENITIVE_FORMS) : EXPORT_CONTEXT_BY_CONTENT
  } else if (span !== '') base = span
  else base = hasAutoRows(container) ? EXPORT_CONTEXT_BY_ROW_CONTENT : EXPORT_CONTEXT_GRID_ROW_HEIGHT
  return partsOr([base, selfPart(CSS.minHeight, self.minHeight)], base)
}

/** Размер по осям в grid-ячейке: ширина — колонки (растянута или по содержимому по `justify-items`), высота — `gridHeight`. */
function gridAxes(self: SelfProps, container: GridContainer): AxisTexts {
  const colSpan = spanOf(self.colSpan)
  const width =
    container.justifyItems === CSS_DEFAULT_ALIGN
      ? occupiesText(colSpan, EXPORT_CONTEXT_COLUMN_ACCUSATIVE_FORMS)
      : withinText(colSpan, EXPORT_CONTEXT_COLUMN_GENITIVE_FORMS)
  return { width, height: gridHeight(self, container) }
}

/** Конечный замер ширины узла или `undefined`. */
function measuredWidth(options: ExportOptions, nodeId: NodeId): number | undefined {
  const width = options.measuredWidths?.get(nodeId)
  return width !== undefined && Number.isFinite(width) ? width : undefined
}

/**
 * Контентная ширина родителя: замер превью минус фиксированный редакторский отступ с двух сторон (в экспорте
 * его нет, а замеры сделаны на канвасе); `undefined`, если не положительна.
 */
function parentContentWidth(place: NodePlace, options: ExportOptions): number | undefined {
  const width = measuredWidth(options, place.parent.id)
  if (width === undefined) return undefined
  const content = width - BLOCK_PADDING_PX * 2
  return content > 0 ? content : undefined
}

/**
 * Замер ширины: ` (~1128px, ~100% ширины родителя)`. Доля — от контентной ширины родителя (без редакторского отступа),
 * поэтому растянутый ребёнок даёт ≈100%. Нет конечного замера узла → пустая строка.
 */
function measuredText(place: NodePlace, options: ExportOptions): string {
  const width = measuredWidth(options, place.node.id)
  if (width === undefined) return ''
  const parts = [EXPORT_CONTEXT_MEASURED_WIDTH.replace('{w}', String(width))]
  const content = parentContentWidth(place, options)
  if (content !== undefined) {
    const share = Math.round((width / content) * EXPORT_PERCENT)
    parts.push(EXPORT_CONTEXT_MEASURED_SHARE.replace('{p}', String(share)))
  }
  return ` (${parts.join(EXPORT_LIST_SEPARATOR)})`
}

/** Подпись оси и её описание: `ширина — растягивается на всю ширину родителя`. */
function axisPart(label: string, text: string): string {
  return `${label}${EXPORT_CONTEXT_AXIS_SEPARATOR}${text}`
}

/**
 * Место: `Место: 2-й ребёнок из 3; ширина — растягивается на всю ширину родителя (~1128px, ~100% ширины родителя);
 * высота — по содержимому; повторяется ×3`.
 */
function placeLine(place: NodePlace, options: ExportOptions): string {
  const { node, parent, index } = place
  const position = EXPORT_CONTEXT_POSITION.replace('{k}', String(index + 1)).replace(
    '{m}',
    String(parent.children.length),
  )
  const { container } = parent
  const axes = container.kind === 'flex' ? flexAxes(node.self, container) : gridAxes(node.self, container)
  const repeat = repeatMark(node, EXPORT_REPEAT_MARK)
  const parts = [
    position,
    axisPart(EXPORT_CONTEXT_WIDTH_LABEL, `${axes.width}${measuredText(place, options)}`),
    axisPart(EXPORT_CONTEXT_HEIGHT_LABEL, axes.height),
    repeat === '' ? '' : `${EXPORT_CONTEXT_REPEATED} ${repeat}`,
  ]
  return `${EXPORT_CONTEXT_PLACE} ${joinParts(parts, EXPORT_CONTEXT_PLACE_SEPARATOR)}`
}

/**
 * Многострочный комментарий-контекст вложенного узла: строка корня, затем путь, родитель и место.
 * Экранирование — в `formatComment`. Для корня и отсутствующего узла — пустой массив.
 */
export function contextLines(doc: LayoutDocument, nodeId: NodeId, options: ExportOptions): string[] {
  const place = locatePlace(doc, nodeId)
  if (!place) return []
  const body = [pathLine(place.path), parentLine(place.parent), placeLine(place, options)]
  return formatComment(rootLine(place.entry), body, '')
}
