/**
 * Composable фрагмента CanvasRoot: стиль положения (с предпросмотром при перемещении за заголовок), подписи
 * и замер высоты корня (ResizeObserver → cameraStore).
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CanvasRootProps } from './canvas-node.types'
import { useCameraStore } from './camera-store'
import { useDragStore } from './dnd/drag-store'
import { rootPlacementStyle, rootTitle, rootWidthText } from './node-view'

/** Подключает корень к полю: возвращает ref элемента, стиль положения и подписи над блоком. */
export function useCanvasRoot(props: CanvasRootProps) {
  const cameraStore = useCameraStore()
  const dragStore = useDragStore()
  /** Корневой элемент корня на поле. */
  const rootEl = ref<HTMLElement | null>(null)
  let observer: ResizeObserver | null = null

  /** Этот корень сейчас двигают за заголовок: булев computed, чтобы движение мыши не трогало остальные корни. */
  const isMoving = computed<boolean>(() => dragStore.movingRootId === props.root.node.id)

  /** Динамический стиль: позиция и ширина превью на поле; во время перемещения — новая точка (документ ещё не менялся). */
  const style = computed(() => {
    const at = isMoving.value ? dragStore.rootPosition : null
    return rootPlacementStyle(at === null ? props.root.canvas : { ...props.root.canvas, x: at.x, y: at.y })
  })
  /** BEM-классы корня: `--moving`, пока его двигают (поверх соседей, курсор «сжатая рука»). */
  const classes = computed(() => ({ 'canvas-root': true, 'canvas-root--moving': isMoving.value }))
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

  return { rootEl, classes, style, title, widthText }
}
