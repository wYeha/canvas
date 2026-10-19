/**
 * Чистая логика оформления блоков на канвасе: глубина и цвет, значки, подписи, классы, позиция корня,
 * список отрисовки детей с копиями повтора (`repeat`).
 */
import type { BlockNode, CanvasPlacement, ContainerKind, NodeId } from '@shared'
import {
  BLOCK_PALETTE_SIZE,
  CSS_PX_UNIT,
  DEFAULT_REPEAT,
  DIRECTION_ICONS,
  REPEAT_KEY_SEPARATOR,
  REPEAT_MARK,
  REPEAT_MAX,
  ROOT_TITLE_SEPARATOR,
  ROOT_UNTITLED_LABEL,
} from './constants'

/**
 * Ребёнок в списке отрисовки: сам блок или его копия повтора.
 * `copyOf` — id исходного блока с повтором, к которому относятся клик, ховер и перетаскивание
 * (`null` — настоящий блок); `copyRoot` — верхний элемент копии (на нём приглушение, внутри копии — нет).
 */
export interface RenderChild {
  key: string
  node: BlockNode
  copyOf: NodeId | null
  copyRoot: boolean
}

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

/** Сколько раз блок рисуется на канвасе: `repeat` в пределах 1…`REPEAT_MAX` (нецелое — вниз). */
export function repeatCount(block: BlockNode): number {
  const count = Math.trunc(block.repeat)
  if (!Number.isFinite(count) || count < DEFAULT_REPEAT) return DEFAULT_REPEAT
  return Math.min(count, REPEAT_MAX)
}

/** Знак повтора после подписи (`×3`) при `repeat > 1`, иначе пустая строка. Число — как в документе. */
export function repeatMark(block: BlockNode): string {
  return block.repeat > DEFAULT_REPEAT ? `${REPEAT_MARK}${String(block.repeat)}` : ''
}

/**
 * Список отрисовки детей блока: каждый ребёнок, а сразу за ним — его копии повтора (N − 1 штук).
 * `copyOf` — в копии ли сам родитель: тогда и дети, и их копии относятся к тому же исходному блоку.
 * Вложенный повтор внутри повтора даёт N × M копий.
 */
export function renderChildren(children: readonly BlockNode[], copyOf: NodeId | null): RenderChild[] {
  return children.flatMap((node) => {
    const own: RenderChild = { key: node.id, node, copyOf, copyRoot: false }
    const copies = Array.from({ length: repeatCount(node) - 1 }, (_, index) => ({
      key: `${node.id}${REPEAT_KEY_SEPARATOR}${String(index + 1)}`,
      node,
      copyOf: copyOf ?? node.id,
      copyRoot: copyOf === null,
    }))
    return [own, ...copies]
  })
}
