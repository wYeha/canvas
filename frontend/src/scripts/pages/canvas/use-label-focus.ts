/**
 * Фокус подписей поля (16.2): общий набор id (выделенный, наведённый и их предки) — один на поле через provide/inject,
 * а каждый блок держит свой булев computed: смена наведения будит только блоки, у которых он поменялся.
 */
import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { NodeId } from '@shared'
import { labelFocusIds } from './label-focus'
import { useLayoutStore } from './layout-store'

/** Ключ provide/inject набора id в фокусе подписей. */
const LABEL_FOCUS_KEY: InjectionKey<ComputedRef<ReadonlySet<NodeId>>> = Symbol('label-focus')

/** Считает набор id в фокусе подписей и отдаёт его блокам поля. */
export function provideLabelFocus(): void {
  const layoutStore = useLayoutStore()
  const ids = computed(() => labelFocusIds(layoutStore.document, layoutStore.selectedId, layoutStore.hoveredId))
  provide(LABEL_FOCUS_KEY, ids)
}

/** В фокусе ли подпись блока `id` (у копии — `null`, никогда); вне поля — нет. */
export function useIsLabelFocus(id: ComputedRef<NodeId | null>): ComputedRef<boolean> {
  const ids = inject(LABEL_FOCUS_KEY, null)
  return computed(() => id.value !== null && ids !== null && ids.value.has(id.value))
}
