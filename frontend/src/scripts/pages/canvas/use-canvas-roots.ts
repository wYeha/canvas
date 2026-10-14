/** Composable слоя корней в CanvasViewport: список корней документа и признак пустого поля. */
import { computed } from 'vue'
import { useLayoutStore } from './layout-store'

/** Возвращает корни документа и `isEmpty` для подсказки пустого поля. */
export function useCanvasRoots() {
  const store = useLayoutStore()
  /** Корневые блоки документа. */
  const roots = computed(() => store.document.roots)
  /** На поле нет ни одного корня. */
  const isEmpty = computed(() => roots.value.length === 0)
  return { roots, isEmpty }
}
