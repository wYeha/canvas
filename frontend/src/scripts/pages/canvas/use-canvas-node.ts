/** Composable фрагмента CanvasNode: из узла собирает вид (классы, стили раскладки, значок, подпись) для шаблона. */
import { computed, type ComputedRef } from 'vue'
import type { BlockNode } from '@shared'
import type { CanvasNodeProps } from './canvas-node.types'
import { useDragStore } from './dnd/drag-store'
import { useLayoutStore } from './layout-store'
import { styleEntries, toStyleObject } from './node-style'
import { blockClasses, blockLabel, directionIcon, isLeafBlock, linkCaptionFromLabel, linkClasses } from './node-view'

/** Вид плашки связи. */
export interface LinkView {
  kind: 'link'
  classes: string[]
  style: Record<string, string>
  text: string
}

/** Вид блока: классы, стили, значок типа, подпись и дети. */
export interface BlockView {
  kind: 'block'
  classes: string[]
  style: Record<string, string>
  icon: string
  label: string
  leaf: boolean
  children: BlockNode['children']
}

/** Вид узла для шаблона. */
export type NodeView = LinkView | BlockView

/** Результат `useCanvasNode`: вид узла и его итоговые классы (с состоянием перетаскивания). */
export interface CanvasNodeState {
  view: ComputedRef<NodeView>
  classes: ComputedRef<string[]>
}

/** Возвращает вычисляемый вид узла; глубина и цвет считаются при рендере, в данных не хранятся. */
export function useCanvasNode(props: CanvasNodeProps): CanvasNodeState {
  const store = useLayoutStore()
  const dragStore = useDragStore()

  /** Вид узла: заглушка связи или оформленный блок. */
  const view = computed<NodeView>(() => {
    const { node, depth, parentKind } = props
    const style = toStyleObject(styleEntries(node, parentKind))
    if (node.type === 'link') {
      const text = linkCaptionFromLabel(store.rootLabelMap.get(node.sourceId))
      return { kind: 'link', classes: linkClasses(), style, text }
    }
    return {
      kind: 'block',
      classes: blockClasses(node, depth, parentKind),
      style,
      icon: directionIcon(node),
      label: blockLabel(node),
      leaf: isLeafBlock(node),
      children: node.children,
    }
  })

  /** Этот узел сейчас перетаскивают: отдельный булев computed, чтобы начало и конец жеста не пересобирали вид. */
  const isDragSource = computed<boolean>(() => dragStore.draggingId === props.node.id)

  /** Классы узла: вид плюс пунктирный след на месте, пока узел перетаскивают. */
  const classes = computed<string[]>(() =>
    isDragSource.value ? [...view.value.classes, 'canvas-node--drag-source'] : view.value.classes,
  )

  return { view, classes }
}
