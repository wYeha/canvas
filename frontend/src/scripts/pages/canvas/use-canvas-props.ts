/** Composable панели свойств: заголовок и список секций выделенного узла (только реализованных). */
import { computed, type Component } from 'vue'
import { PROPS_SECTION_TITLES } from './constants'
import { useLayoutStore } from './layout-store'
import { propsHeader, propsSectionIds, type PropsSectionId } from './props-sections'
import { childHint } from './props-child'
import { findParent } from './tree-query'

/** Секция для шаблона: id, заголовок и компонент-фрагмент. */
export interface PropsSectionView {
  id: PropsSectionId
  title: string
  hint?: string
  component: Component
}

/** Строит заголовок и секции по выделению; секции без компонента в реестре пропускаются. */
export function useCanvasProps(registry: Partial<Record<PropsSectionId, Component>>) {
  const layoutStore = useLayoutStore()

  /** Родитель выделенного узла; `undefined` у корня или без выделения. */
  const parent = computed(() => {
    const node = layoutStore.selectedNode
    return node === undefined ? undefined : findParent(layoutStore.document, node.id)
  })

  /** Вид контейнера родителя выделенного узла; `null` у корня. */
  const parentKind = computed(() => parent.value?.container.kind ?? null)

  /** Подсказка секции «Как ребёнок» по контейнеру родителя; `undefined` у корня. */
  const hint = computed(() => (parent.value === undefined ? undefined : childHint(parent.value.container)))

  /** Заголовок панели; `null`, если ничего не выделено. */
  const header = computed(() => {
    const node = layoutStore.selectedNode
    return node === undefined ? null : propsHeader(node, parentKind.value)
  })

  /** Секции выделенного узла в порядке показа. */
  const sections = computed<PropsSectionView[]>(() => {
    const node = layoutStore.selectedNode
    if (node === undefined) return []
    return propsSectionIds(parentKind.value).flatMap((id) => {
      const component = registry[id]
      if (component === undefined) return []
      return [{ id, title: PROPS_SECTION_TITLES[id], component, hint: id === 'child' ? hint.value : undefined }]
    })
  })

  return { header, sections }
}
