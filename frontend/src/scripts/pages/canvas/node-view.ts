/**
 * Чистая логика оформления блоков на канвасе: глубина и цвет, значки, подписи, классы, позиция корня,
 * список отрисовки детей с копиями повтора (`repeat`).
 */
import {
  isLinkBlock,
  type BlockNode,
  type CanvasPlacement,
  type ContainerKind,
  type LayoutDocument,
  type NodeId,
} from '@shared'
import {
  BLOCK_PALETTE_SIZE,
  CSS_PX_UNIT,
  DEFAULT_REPEAT,
  DIRECTION_ICONS,
  LINK_ICON,
  LINK_MISSING_LABEL,
  REPEAT_KEY_SEPARATOR,
  REPEAT_MARK,
  REPEAT_MAX,
  REPEAT_RENDER_BUDGET,
  ROOT_TITLE_SEPARATOR,
  ROOT_UNTITLED_LABEL,
  SCROLL_NODE_CLASS_PREFIX,
} from './constants'

/**
 * Ребёнок в списке отрисовки: сам блок или его копия повтора.
 * `copyOf` — id исходного блока с повтором, к которому относятся клик, ховер и перетаскивание
 * (`null` — настоящий блок); `copyRoot` — верхний элемент копии (на нём приглушение, внутри копии — нет);
 * `budget` — остаток бюджета копий, доступный поддереву настоящего блока (у копии не используется: она принята целиком).
 */
export interface RenderChild {
  key: string
  node: BlockNode
  copyOf: NodeId | null
  copyRoot: boolean
  budget: number
}

/** План отрисовки детей: список и сколько бюджета копий он израсходовал (вместе с поддеревьями настоящих детей). */
export interface RenderPlan {
  items: RenderChild[]
  used: number
}

/** Номер цвета палитры для глубины вложенности (корень — 0). */
export function paletteIndex(depth: number): number {
  return ((depth % BLOCK_PALETTE_SIZE) + BLOCK_PALETTE_SIZE) % BLOCK_PALETTE_SIZE
}

/** Модификатор цвета по глубине: `canvas-node--depth-3`. */
export function depthClass(depth: number): string {
  return `canvas-node--depth-${String(paletteIndex(depth))}`
}

/** Значок узла: у связи — `→`, у блока — направление контейнера (стрелка для flex, `#` для grid). */
export function directionIcon(block: BlockNode): string {
  if (isLinkBlock(block)) return LINK_ICON
  return block.container.kind === 'grid' ? DIRECTION_ICONS.grid : DIRECTION_ICONS[block.container.direction]
}

/** Подписи корней по id: по ним связи показывают имя источника без поиска по документу. */
export type SourceLabels = ReadonlyMap<NodeId, string>

/** Пустая карта подписей: для узлов, которые точно не связи (подписи источников им не нужны). */
export const NO_SOURCE_LABELS: SourceLabels = new Map()

/** Карта «id корня → подпись» (пустая подпись — «Без подписи»). */
export function rootLabelMap(doc: Pick<LayoutDocument, 'roots'>): Map<NodeId, string> {
  return new Map(doc.roots.map((root) => [root.node.id, rootTitle(root.node)]))
}

/**
 * Связь в живом зеркале: содержимое источника (контейнер, тег, дети) со своими id, свойствами места и повтором
 * связи — так же, как её выведет экспорт. Остаётся связью (`sourceId`): значок и цвет плашки сохраняются.
 */
export function mirrorBlock(link: BlockNode & { sourceId: NodeId }, source: BlockNode): BlockNode {
  return { ...source, id: link.id, label: link.label, self: link.self, repeat: link.repeat, sourceId: link.sourceId }
}

/** Имя источника связи; источника нет — «источник не найден». */
export function linkSourceName(sourceId: NodeId, labels: SourceLabels): string {
  return labels.get(sourceId) ?? LINK_MISSING_LABEL
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

/** BEM-классы блока: база, цвет по глубине, лист и пустой лист, область прокрутки. */
export function blockClasses(block: BlockNode, depth: number, parentKind: ContainerKind | null): string[] {
  const classes = ['canvas-node', depthClass(depth)]
  if (isLinkBlock(block)) classes.push('canvas-node--link')
  if (isLeafBlock(block)) classes.push('canvas-node--leaf')
  if (needsLeafMinHeight(block, parentKind)) classes.push('canvas-node--min-height')
  if (block.container.scroll !== undefined) classes.push(`${SCROLL_NODE_CLASS_PREFIX}${block.container.scroll}`)
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

/**
 * Динамический стиль корня: позиция и ширина превью на поле; высота — только если задана и рисуются числа размеров
 * (`withHeight`, в «Структуре» — нет).
 */
export function rootPlacementStyle(canvas: CanvasPlacement, withHeight = true): Record<string, string> {
  const style: Record<string, string> = {
    left: `${String(canvas.x)}${CSS_PX_UNIT}`,
    top: `${String(canvas.y)}${CSS_PX_UNIT}`,
    width: `${String(canvas.width)}${CSS_PX_UNIT}`,
  }
  if (withHeight && canvas.height !== null) style['height'] = `${String(canvas.height)}${CSS_PX_UNIT}`
  return style
}

/** Сколько раз блок рисуется на канвасе: `repeat` в пределах 1…`REPEAT_MAX` (нецелое — вниз). */
export function repeatCount(block: BlockNode): number {
  const count = Math.trunc(block.repeat)
  if (!Number.isFinite(count) || count < DEFAULT_REPEAT) return DEFAULT_REPEAT
  return Math.min(count, REPEAT_MAX)
}

/** Знак повтора (`×3`) при `repeat > 1`, иначе пустая строка. Число — как в документе; `mark` — знак (в экспорте свой). */
export function repeatMark(block: BlockNode, mark: string = REPEAT_MARK): string {
  return block.repeat > DEFAULT_REPEAT ? `${mark}${String(block.repeat)}` : ''
}

/** Сколько блоков рисует копия узла: он сам и его поддерево со всеми копиями повтора внутри (N × M для вложенных). */
export function cloneSize(node: BlockNode): number {
  return node.children.reduce((sum, child) => sum + repeatCount(child) * cloneSize(child), 1)
}

/** Копия `index` (с 1) блока `node`; `copyOf` родителя — внутри копии всё относится к её исходному блоку. */
function copyItem(node: BlockNode, index: number, copyOf: NodeId | null): RenderChild {
  return {
    key: `${node.id}${REPEAT_KEY_SEPARATOR}${String(index)}`,
    node,
    copyOf: copyOf ?? node.id,
    copyRoot: copyOf === null,
    budget: 0,
  }
}

/**
 * Список отрисовки детей настоящего блока с бюджетом копий: за каждым ребёнком идут его копии, пока они
 * помещаются в остаток `budget`; поддерево ребёнка получает остаток после предыдущих братьев (обход по порядку,
 * без общего изменяемого счётчика между компонентами). Исходные блоки рисуются всегда.
 */
function planOwnChildren(children: readonly BlockNode[], budget: number): RenderPlan {
  const items: RenderChild[] = []
  let remaining = budget
  for (const node of children) {
    items.push({ key: node.id, node, copyOf: null, copyRoot: false, budget: remaining })
    remaining -= planOwnChildren(node.children, remaining).used
    const size = cloneSize(node)
    for (let index = 1; index < repeatCount(node) && size <= remaining; index += 1) {
      items.push(copyItem(node, index, null))
      remaining -= size
    }
  }
  return { items, used: budget - remaining }
}

/**
 * Список отрисовки детей блока: каждый ребёнок, а сразу за ним — его копии повтора (N − 1 штук).
 * `copyOf` — в копии ли сам родитель: тогда и дети, и их копии относятся к тому же исходному блоку, а бюджет
 * не тратится (копию приняли целиком, её размер учтён у владельца). Вложенный повтор даёт N × M копий,
 * но не больше `budget` блоков на всё дерево корня (`REPEAT_RENDER_BUDGET`).
 */
export function renderChildren(
  children: readonly BlockNode[],
  copyOf: NodeId | null,
  budget: number = REPEAT_RENDER_BUDGET,
): RenderChild[] {
  if (copyOf === null) return planOwnChildren(children, budget).items
  return children.flatMap((node) => [
    { key: node.id, node, copyOf, copyRoot: false, budget: 0 },
    ...Array.from({ length: repeatCount(node) - 1 }, (_, index) => copyItem(node, index + 1, copyOf)),
  ])
}
