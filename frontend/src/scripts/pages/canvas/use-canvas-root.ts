/** Composable фрагмента CanvasRoot: стиль положения, подписи и замер высоты корня (ResizeObserver → cameraStore). */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CanvasRootProps } from './canvas-node.types'
import { useCameraStore } from './camera-store'
import { rootPlacementStyle, rootTitle, rootWidthText } from './node-view'

/** Подключает корень к полю: возвращает ref элемента, стиль положения и подписи над блоком. */
export function useCanvasRoot(props: CanvasRootProps) {
  const cameraStore = useCameraStore()
  /** Корневой элемент корня на поле. */
  const rootEl = ref<HTMLElement | null>(null)
  let observer: ResizeObserver | null = null

  /** Динамический стиль: позиция и ширина превью на поле. */
  const style = computed(() => rootPlacementStyle(props.root.canvas))
  /** Подпись корня. */
  const title = computed(() => rootTitle(props.root.node))
  /** Ширина превью. */
  const widthText = computed(() => rootWidthText(props.root.canvas))

  /** Передаёт в стор высоту корня в координатах поля (offsetHeight не зависит от зума). */
  function measure(): void {
    if (rootEl.value !== null) cameraStore.setRootHeight(props.root.node.id, rootEl.value.offsetHeight)
  }

  onMounted(() => {
    if (rootEl.value === null) return
    measure()
    observer = new ResizeObserver(measure)
    observer.observe(rootEl.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
    cameraStore.removeRootHeight(props.root.node.id)
  })

  return { rootEl, style, title, widthText }
}
