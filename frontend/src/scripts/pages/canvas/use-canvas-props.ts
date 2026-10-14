/** Composable панели свойств: заголовок и список секций выделенного узла (только реализованных). */
import { computed, type Component } from 'vue'
import { PROPS_SECTION_TITLES } from './constants'
import { useLayoutStore } from './layout-store'
import { propsHeader, propsSectionIds, type PropsSectionId } from './props-sections'
import { findParent } from './tree-query'

/** Секция для шаблона: id, заголовок и компонент-фрагмент. */
export interface PropsSectionView {
  id: PropsSectionId
  title: string
  component: Component
}

/** Строит заголовок и секции по выделению; секции без компонента в реестре пропускаются. */
export function useCanvasProps(registry: Partial<Record<PropsSectionId, Component>>) {
  const layoutStore = useLayoutStore()

  /** Вид контейнера родителя выделенного узла; `null` у корня. */
  const parentKind = computed(() => {
    const node = layoutStore.selectedNode
    return node === undefined ? null : (findParent(layoutStore.document, node.id)?.container.kind ?? null)
  })

  /** Заголовок панели; `null`, если ничего не выделено. */
  const header = computed(() => {
    const node = layoutStore.selectedNode
    return node === undefined ? null : propsHeader(layoutStore.document, node, parentKind.value)
  })

  /** Секции выделенного узла в порядке показа. */
  const sections = computed<PropsSectionView[]>(() => {
    const node = layoutStore.selectedNode
    if (node === undefined) return []
    return propsSectionIds(node.type, parentKind.value).flatMap((id) => {
      const component = registry[id]
      return component === undefined ? [] : [{ id, title: PROPS_SECTION_TITLES[id], component }]
    })
  })

  return { header, sections }
}
