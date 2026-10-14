/** Чистая логика оформления блоков на канвасе: глубина и цвет, значки, подписи, классы, позиция корня. */
import type { BlockNode, CanvasPlacement, ContainerKind, LayoutDocument, NodeId } from '@shared'
import {
  BLOCK_PALETTE_SIZE,
  CSS_PX_UNIT,
  DIRECTION_ICONS,
  LINK_ICON,
  LINK_MISSING_LABEL,
  ROOT_TITLE_SEPARATOR,
  ROOT_UNTITLED_LABEL,
} from './constants'

/** Номер цвета палитры для глубины вложенности (корень — 0). */
export function paletteIndex(depth: number): number {
  return ((depth % BLOCK_PALETTE_SIZE) + BLOCK_PALETTE_SIZE) % BLOCK_PALETTE_SIZE
}

/** Модификатор цвета по глубине: `canvas-node--depth-3`. */
export function depthClass(depth: number): string {
  return `canvas-node--depth-${String(paletteIndex(depth))}`
}

/** Значок направления контейнера: стрелка для flex, `#` для grid. */
export function directionIcon(block: BlockNode): string {
  return block.container.kind === 'grid' ? DIRECTION_ICONS.grid : DIRECTION_ICONS[block.container.direction]
}

/** Блок без детей: подпись рисуется по центру, без чипа. */
export function isLeafBlock(block: BlockNode): boolean {
  return block.children.length === 0
}

/**
 * Пустой лист, которому редактор даёт min-height: у него нет детей и нет заданной высоты.
 * `self` корня в стили не попадает (`parentKind === null`), поэтому для корня он не учитывается.
 */
export function needsLeafMinHeight(block: BlockNode, parentKind: ContainerKind | null): boolean {
  if (!isLeafBlock(block)) return false
  if (parentKind === null) return true
  const { height, minHeight } = block.self
  return (height ?? '').trim() === '' && (minHeight ?? '').trim() === ''
}

/** BEM-классы блока: база, цвет по глубине, лист и пустой лист. */
export function blockClasses(block: BlockNode, depth: number, parentKind: ContainerKind | null): string[] {
  const classes = ['canvas-node', depthClass(depth)]
  if (isLeafBlock(block)) classes.push('canvas-node--leaf')
  if (needsLeafMinHeight(block, parentKind)) classes.push('canvas-node--min-height')
  return classes
}

/** Подпись блока без пробелов по краям; пустая строка, если подписи нет. */
export function blockLabel(block: BlockNode): string {
  return block.label.trim()
}

/** Подпись корня над блоком: название и ширина превью (`Дашборд · 1440`) для текста и отдельно ширина. */
export function rootTitle(block: BlockNode): string {
  const label = blockLabel(block)
  return label === '' ? ROOT_UNTITLED_LABEL : label
}

/** Ширина превью корня как строка: `1440`. */
export function rootWidthText(canvas: CanvasPlacement): string {
  return String(Math.round(canvas.width))
}

/** Полный текст заголовка корня для подсказки: `Дашборд · 1440`. */
export function rootCaption(block: BlockNode, canvas: CanvasPlacement): string {
  return `${rootTitle(block)}${ROOT_TITLE_SEPARATOR}${rootWidthText(canvas)}`
}

/** Подпись плашки связи: `→ <подпись источника>`. */
export function linkCaption(doc: Pick<LayoutDocument, 'roots'>, sourceId: NodeId): string {
  const source = doc.roots.find((root) => root.node.id === sourceId)?.node
  const label = source === undefined ? '' : blockLabel(source)
  return `${LINK_ICON} ${label === '' ? LINK_MISSING_LABEL : label}`
}

/** Динамический стиль корня: позиция и ширина превью на поле; высота — только если задана. */
export function rootPlacementStyle(canvas: CanvasPlacement): Record<string, string> {
  const style: Record<string, string> = {
    left: `${String(canvas.x)}${CSS_PX_UNIT}`,
    top: `${String(canvas.y)}${CSS_PX_UNIT}`,
    width: `${String(canvas.width)}${CSS_PX_UNIT}`,
  }
  if (canvas.height !== null) style['height'] = `${String(canvas.height)}${CSS_PX_UNIT}`
  return style
}
