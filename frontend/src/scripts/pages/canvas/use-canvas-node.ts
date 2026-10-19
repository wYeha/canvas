/** Composable фрагмента CanvasNode: из узла собирает вид (классы, стили раскладки, значок, подпись) для шаблона. */
import { computed, type ComputedRef } from 'vue'
import type { BlockNode } from '@shared'
import type { CanvasNodeProps } from './canvas-node.types'
import { useDragStore } from './dnd/drag-store'
import { styleEntries, toStyleObject } from './node-style'
import { blockClasses, blockLabel, directionIcon, isLeafBlock } from './node-view'

/** Вид блока для шаблона: классы, стили, значок типа, подпись и дети. */
export interface NodeView {
  classes: string[]
  style: Record<string, string>
  icon: string
  label: string
  leaf: boolean
  children: BlockNode['children']
}

/** Результат `useCanvasNode`: вид узла и его итоговые классы (с состоянием перетаскивания). */
export interface CanvasNodeState {
  view: ComputedRef<NodeView>
  classes: ComputedRef<string[]>
}

/** Возвращает вычисляемый вид узла; глубина и цвет считаются при рендере, в данных не хранятся. */
export function useCanvasNode(props: CanvasNodeProps): CanvasNodeState {
  const dragStore = useDragStore()

  /** Вид оформленного блока. */
  const view = computed<NodeView>(() => {
    const { node, depth, parentKind } = props
    return {
      classes: blockClasses(node, depth, parentKind),
      style: toStyleObject(styleEntries(node, parentKind)),
      icon: directionIcon(node),
      label: blockLabel(node),
      leaf: isLeafBlock(node),
      children: node.children,
    }
  })

  /** Этот узел сейчас перетаскивают: отдельный булев computed, чтобы начало и конец жеста не пересобирали вид. */
  const isDragSource = computed<boolean>(() => dragStore.draggingId === props.node.id)

  /**
   * Этот блок — приёмник drop: другой узел тянут, `dropTarget` указывает сюда (пунктир в SCSS, не оверлей).
   * Не совпадает с `isDragSource` (след на перетаскиваемом узле).
   */
  const isDropReceiver = computed<boolean>(
    () =>
      dragStore.draggingId !== null &&
      dragStore.dropTarget?.kind === 'block' &&
      dragStore.dropTarget.id === props.node.id,
  )

  /** Классы узла: вид, след перетаскиваемого и подсветка приёмника. */
  const classes = computed<string[]>(() => {
    const extra: string[] = []
    if (isDragSource.value) extra.push('canvas-node--drag-source')
    if (isDropReceiver.value) extra.push('canvas-node--drop-target')
    return extra.length === 0 ? view.value.classes : [...view.value.classes, ...extra]
  })

  return { view, classes }
}
