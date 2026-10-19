/** Composable фрагмента CanvasNode: из узла собирает вид (классы, стили раскладки, значок, подпись, копии повтора) для шаблона; связь — плашка с именем источника. */
import { computed, type ComputedRef } from 'vue'
import { isLinkBlock, type NodeId } from '@shared'
import type { CanvasNodeProps } from './canvas-node.types'
import { REPEAT_RENDER_BUDGET } from './constants'
import { useDragStore } from './dnd/drag-store'
import { useLayoutStore } from './layout-store'
import { styleEntries, toStyleObject } from './node-style'
import {
  blockClasses,
  blockLabel,
  directionIcon,
  isLeafBlock,
  linkSourceName,
  renderChildren,
  repeatMark,
  type RenderChild,
} from './node-view'

/** Вид блока для шаблона: классы, стили, значок типа, подпись, знак повтора и дети (с копиями повтора). */
export interface NodeView {
  classes: string[]
  style: Record<string, string>
  icon: string
  label: string
  /** `×N` после подписи у настоящего блока с повтором; у копий и без повтора — пусто. */
  repeat: string
  leaf: boolean
  children: RenderChild[]
}

/** Результат `useCanvasNode`: вид узла, его итоговые классы (с состоянием перетаскивания) и атрибуты пометки. */
export interface CanvasNodeState {
  view: ComputedRef<NodeView>
  classes: ComputedRef<string[]>
  /** `data-node-id` настоящего блока; у копии повтора — `null` (атрибута нет). */
  nodeAttr: ComputedRef<NodeId | null>
  /** `data-repeat-of` копии повтора (id исходного блока); у настоящего блока — `null`. */
  repeatAttr: ComputedRef<NodeId | null>
  /** Id для `data-label-node-id` подписи (двойной клик — переименование); у копии — `null`. */
  labelAttr: ComputedRef<NodeId | null>
}

/** Возвращает вычисляемый вид узла; глубина и цвет считаются при рендере, в данных не хранятся. */
export function useCanvasNode(props: CanvasNodeProps): CanvasNodeState {
  const dragStore = useDragStore()
  const layoutStore = useLayoutStore()

  /**
   * Подпись узла: у связи — имя источника, у блока — своя. Подписи корней читаются только у связи: иначе каждый
   * узел зависел бы от любой правки документа.
   */
  function nodeLabel(): string {
    const { node } = props
    return isLinkBlock(node) ? linkSourceName(node.sourceId, layoutStore.rootLabels) : blockLabel(node)
  }

  /** Копия повтора: id исходного блока или `null` у настоящего блока. */
  const copyOf = computed<NodeId | null>(() => props.copyOf ?? null)

  /** Вид оформленного блока. */
  const view = computed<NodeView>(() => {
    const { node, depth, parentKind } = props
    const classes = blockClasses(node, depth, parentKind)
    if (props.copyRoot === true) classes.push('canvas-node--repeat-copy')
    return {
      classes,
      style: toStyleObject(styleEntries(node, parentKind)),
      icon: directionIcon(node),
      label: nodeLabel(),
      // У корня ×N не показываем: повтор корня не рисуется и не экспортируется
      repeat: copyOf.value === null && parentKind !== null ? repeatMark(node) : '',
      leaf: isLeafBlock(node),
      children: renderChildren(node.children, copyOf.value, props.copyBudget ?? REPEAT_RENDER_BUDGET),
    }
  })

  /** Этот узел сейчас перетаскивают: отдельный булев computed, чтобы начало и конец жеста не пересобирали вид. */
  const isDragSource = computed<boolean>(() => copyOf.value === null && dragStore.draggingId === props.node.id)

  /**
   * Этот блок — приёмник drop: другой узел тянут, `dropTarget` указывает сюда (пунктир в SCSS, не оверлей).
   * Не совпадает с `isDragSource` (след на перетаскиваемом узле). Копии повтора приёмником не подсвечиваются.
   */
  const isDropReceiver = computed<boolean>(
    () =>
      copyOf.value === null &&
      dragStore.isTargeting &&
      dragStore.dropTarget?.kind === 'block' &&
      dragStore.dropTarget.id === props.node.id,
  )

  /** Блок под курсором отказал протягиваемой связи (свой корень, цикл): красная подсветка. */
  const isLinkDenied = computed<boolean>(() => copyOf.value === null && dragStore.linkDeniedId === props.node.id)

  /** Классы узла: вид, след перетаскиваемого, подсветка приёмника и отказа связи. */
  const classes = computed<string[]>(() => {
    const extra: string[] = []
    if (isDragSource.value) extra.push('canvas-node--drag-source')
    if (isDropReceiver.value) extra.push('canvas-node--drop-target')
    if (isLinkDenied.value) extra.push('canvas-node--link-denied')
    return extra.length === 0 ? view.value.classes : [...view.value.classes, ...extra]
  })

  /** Пометка настоящего блока: копии её не получают, иначе замеры, выделение и DnD нашли бы копию. */
  const nodeAttr = computed<NodeId | null>(() => (copyOf.value === null ? props.node.id : null))
  /** Пометка копии повтора: клик, ховер и перетаскивание по ней относятся к исходному блоку. */
  const repeatAttr = copyOf
  /** Подпись копии не переименовывает отдельно: двойной клик по копии ловится по `data-repeat-of`. */
  const labelAttr = nodeAttr

  return { view, classes, nodeAttr, repeatAttr, labelAttr }
}
