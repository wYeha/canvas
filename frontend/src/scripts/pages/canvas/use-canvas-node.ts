/** Composable фрагмента CanvasNode: из узла собирает вид (классы, стили раскладки, значок, подпись) для шаблона. */
import { computed, type ComputedRef } from 'vue'
import type { BlockNode } from '@shared'
import type { CanvasNodeProps } from './canvas-node.types'
import { useLayoutStore } from './layout-store'
import { styleEntries, toStyleObject } from './node-style'
import { blockClasses, blockLabel, directionIcon, isLeafBlock, linkCaption } from './node-view'

/** Вид плашки связи. */
export interface LinkView {
  kind: 'link'
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

/** Возвращает вычисляемый вид узла; глубина и цвет считаются при рендере, в данных не хранятся. */
export function useCanvasNode(props: CanvasNodeProps): { view: ComputedRef<NodeView> } {
  const store = useLayoutStore()

  /** Вид узла: заглушка связи или оформленный блок. */
  const view = computed<NodeView>(() => {
    const { node, depth, parentKind } = props
    const style = toStyleObject(styleEntries(node, parentKind))
    if (node.type === 'link') {
      return { kind: 'link', style, text: linkCaption(store.document, node.sourceId) }
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

  return { view }
}
