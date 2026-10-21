/**
 * Composable фрагмента CanvasMinimap (16.8): на мелком масштабе показывает корни и видимую область поля в маленькой
 * рамке; клик по мини-карте сдвигает поле так, чтобы это место оказалось в центре видимой области (зум не меняется).
 */
import { computed, type ComputedRef } from 'vue'
import type { NodeId } from '@shared'
import { screenToWorld, type Rect } from './camera'
import { useCameraStore } from './camera-store'
import { MINIMAP_FALLBACK_ROOT_HEIGHT, MINIMAP_SIZE } from './constants'
import { isSmallZoom } from './label-focus'
import { useLayoutStore } from './layout-store'
import { minimapLayout, minimapToWorld } from './minimap'

/** Прямоугольник корня на мини-карте с ключом отрисовки. */
export interface MinimapRoot {
  id: NodeId
  rect: Rect
}

/** Поля мини-карты для шаблона. */
export interface CanvasMinimapState {
  visible: ComputedRef<boolean>
  roots: ComputedRef<MinimapRoot[]>
  view: ComputedRef<Rect>
  onClick: (e: MouseEvent) => void
}

/** Собирает мини-карту из корней документа, их замеренных высот и камеры. */
export function useCanvasMinimap(): CanvasMinimapState {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()

  /** Корни в координатах поля: позиция и ширина превью, высота — замеренная (или запасная до замера). */
  const rootRects = computed(() =>
    layoutStore.document.roots.map((entry) => ({
      id: entry.node.id,
      rect: {
        x: entry.canvas.x,
        y: entry.canvas.y,
        width: entry.canvas.width,
        height: cameraStore.rootHeights.get(entry.node.id) ?? MINIMAP_FALLBACK_ROOT_HEIGHT,
      },
    })),
  )

  /** Видимая область поля (без панелей) в координатах поля. */
  const worldView = computed<Rect>(() => {
    const { camera, visibleArea } = cameraStore
    const corner = screenToWorld(camera, { x: visibleArea.x, y: visibleArea.y })
    return { ...corner, width: visibleArea.width / camera.zoom, height: visibleArea.height / camera.zoom }
  })

  const layout = computed(() =>
    minimapLayout(
      rootRects.value.map((item) => item.rect),
      worldView.value,
      MINIMAP_SIZE,
    ),
  )

  /** Мини-карта нужна на мелком масштабе и только если на поле что-то есть. */
  const visible = computed(() => isSmallZoom(cameraStore.camera.zoom) && rootRects.value.length > 0)
  const roots = computed(() =>
    rootRects.value.map((item, index) => ({ id: item.id, rect: layout.value.roots[index] ?? item.rect })),
  )
  const view = computed(() => layout.value.view)

  /** Клик: точка мини-карты → точка поля в центре видимой области. */
  function onClick(e: MouseEvent): void {
    if (!(e.currentTarget instanceof Element)) return
    const box = e.currentTarget.getBoundingClientRect()
    const point = minimapToWorld(layout.value, { x: e.clientX - box.left, y: e.clientY - box.top })
    cameraStore.centerWorldRect({ ...point, width: 0, height: 0 })
  }

  return { visible, roots, view, onClick }
}
