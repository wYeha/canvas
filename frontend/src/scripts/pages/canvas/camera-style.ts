/** Чистые функции стилей камеры: transform слоя мира и фон viewport с адаптивным шагом точек. */
import type { Camera } from './camera'
import { CANVAS_GRID_STEP, GRID_MAX_SCREEN_STEP, GRID_MIN_SCREEN_STEP } from './constants'

/** Стиль слоя мира (type, а не interface: так совместим с `StyleValue` Vue). */
export type WorldLayerStyle = {
  transform: string
  '--camera-zoom': string
}

/** Стиль фона viewport (type, а не interface: так совместим с `StyleValue` Vue). */
export type ViewportBackgroundStyle = {
  backgroundPosition: string
  backgroundSize: string
}

/**
 * Экранный шаг точек сетки: `CANVAS_GRID_STEP · zoom`, удвоенный или поделённый пополам до попадания
 * в `[GRID_MIN_SCREEN_STEP, GRID_MAX_SCREEN_STEP]`; отношение границ ≥ 2, поэтому цикл всегда сходится.
 * Шаг остаётся «степень двойки × шаг поля», поэтому точки при любом шаге лежат в узлах сетки поля
 * (привязку к началу поля даёт `viewportBackgroundStyle`).
 */
export function gridScreenStep(zoom: number): number {
  let step = CANVAS_GRID_STEP * zoom
  if (!Number.isFinite(step) || step <= 0) return CANVAS_GRID_STEP
  while (step < GRID_MIN_SCREEN_STEP) step *= 2
  while (step > GRID_MAX_SCREEN_STEP) step /= 2
  return step
}

/**
 * CSS-transform слоя мира: совпадает с моделью камеры при `transform-origin: 0 0`;
 * переменная `--camera-zoom` нужна подписям, которым обратным масштабом `1 / zoom` возвращают постоянный экранный размер.
 */
export function worldLayerStyle(camera: Camera): WorldLayerStyle {
  return {
    transform: `translate(${String(camera.x)}px, ${String(camera.y)}px) scale(${String(camera.zoom)})`,
    '--camera-zoom': String(camera.zoom),
  }
}

/**
 * Фон viewport: точки масштабируются вместе с полем, одна из них лежит в начале поля.
 * radial-gradient рисует точку в центре тайла, поэтому тайл сдвинут на полшага назад: иначе точки стояли бы
 * между узлами сетки поля и при смене шага s → 2s фон прыгал бы на полшага.
 */
export function viewportBackgroundStyle(camera: Camera): ViewportBackgroundStyle {
  const step = gridScreenStep(camera.zoom)
  const half = step / 2
  return {
    backgroundPosition: `${String(camera.x - half)}px ${String(camera.y - half)}px`,
    backgroundSize: `${String(step)}px ${String(step)}px`,
  }
}
