/**
 * Composable фрагмента CanvasViewport: template refs поля и слоя мира, колесо (пан и зум к курсору),
 * замер размера viewport, классы курсора и стили камеры для фона и слоя мира.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useCameraStore } from './camera-store'
import { wheelToAction } from './camera-input'
import { viewportBackgroundStyle, worldLayerStyle } from './camera-style'
import { useCanvasPan } from './use-canvas-pan'

/** Подключает камеру к viewport: возвращает refs для шаблона, классы и динамические стили. */
export function useCanvasViewport() {
  const cameraStore = useCameraStore()
  const { camera } = storeToRefs(cameraStore)
  /** Корневой элемент поля. */
  const viewportEl = ref<HTMLElement | null>(null)
  /** Слой мира, сдвигаемый и масштабируемый камерой. */
  const worldEl = ref<HTMLElement | null>(null)
  let resizeObserver: ResizeObserver | null = null
  /** Кеш положения viewport на странице: не зовём getBoundingClientRect на каждое событие колеса. */
  let originLeft = 0
  let originTop = 0

  /** `true`, если цель — само поле или что-то внутри слоя мира (не плавающие панели). */
  function isSurface(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) return false
    return target === viewportEl.value || (worldEl.value?.contains(target) ?? false)
  }

  const { spaceHeld, panning } = useCanvasPan(viewportEl, isSurface)

  /**
   * Колесо: Ctrl/щипок — зум к курсору где угодно во viewport (иначе зумится вся страница);
   * обычное колесо — пан, только над поверхностью поля (над панелями прокручивается панель).
   */
  function onWheel(e: WheelEvent): void {
    const action = wheelToAction(e)
    if (action.kind === 'zoom') {
      e.preventDefault()
      const anchor = { x: e.clientX - originLeft, y: e.clientY - originTop }
      cameraStore.zoomAtPoint(anchor, camera.value.zoom * action.factor)
      return
    }
    if (!isSurface(e.target)) return
    e.preventDefault()
    cameraStore.panBy(action.dx, action.dy)
  }

  /** Обновляет кеш положения viewport на странице. */
  function updateOrigin(): void {
    const rect = viewportEl.value?.getBoundingClientRect()
    if (rect === undefined) return
    originLeft = rect.left
    originTop = rect.top
  }

  /** Передаёт в стор новый размер viewport и обновляет кеш его положения. */
  function onResize(entries: ResizeObserverEntry[]): void {
    const entry = entries[0]
    if (entry === undefined) return
    cameraStore.setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    updateOrigin()
  }

  onMounted(() => {
    const el = viewportEl.value
    if (el === null) return
    // Вручную и с passive: false — иначе preventDefault не отменит браузерный зум.
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', updateOrigin)
    updateOrigin()
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(el)
  })

  onBeforeUnmount(() => {
    viewportEl.value?.removeEventListener('wheel', onWheel)
    window.removeEventListener('resize', updateOrigin)
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  /** BEM-классы поля: курсор «рука» при зажатом пробеле и во время тяги. */
  const classes = computed(() => ({
    'canvas-viewport': true,
    'canvas-viewport--pan-ready': spaceHeld.value && !panning.value,
    'canvas-viewport--panning': panning.value,
  }))

  /** Фон с точками, движущийся вместе с полем. */
  const viewportStyle = computed(() => viewportBackgroundStyle(camera.value))

  /** Transform слоя мира. */
  const worldStyle = computed(() => worldLayerStyle(camera.value))

  return { viewportEl, worldEl, classes, viewportStyle, worldStyle }
}
