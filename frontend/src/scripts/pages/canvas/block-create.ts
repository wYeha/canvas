/** Чистая логика создания блоков из тулбара: куда добавить новый блок и где поставить новый корень на поле. */
import type { LayoutNode, NodeId, RootEntry } from '@shared'
import { areaCenter, screenToWorld, type Camera, type Rect } from './camera'
import { NEW_ROOT_HEIGHT_ESTIMATE, NEW_ROOT_MAX_SHIFTS, NEW_ROOT_OFFSET } from './constants'
import type { CanvasPoint } from './factories'

/** Родитель для нового блока: id выделенного блока; без выделения — `null` (будет новый корень). */
export function newBlockParentId(selected: LayoutNode | undefined): NodeId | null {
  return selected?.id ?? null
}

/** Левый верхний угол нового корня шириной `width`, при котором его центр лежит в центре видимой области `area`. */
export function centeredRootOrigin(camera: Camera, area: Rect, width: number): CanvasPoint {
  const center = screenToWorld(camera, areaCenter(area))
  return { x: Math.round(center.x - width / 2), y: Math.round(center.y - NEW_ROOT_HEIGHT_ESTIMATE / 2) }
}

/** Шаг смещения в координатах поля: на экране он всегда около `NEW_ROOT_OFFSET` px, сколько бы ни был зум. */
export function rootShiftStep(zoom: number): number {
  return Math.max(1, Math.round(NEW_ROOT_OFFSET / zoom))
}

/** `true`, если левый верхний угол корня лежит ближе половины шага к точке (новый блок лёг бы поверх него). */
function isCovered(root: RootEntry, point: CanvasPoint, step: number): boolean {
  return Math.abs(root.canvas.x - point.x) < step / 2 && Math.abs(root.canvas.y - point.y) < step / 2
}

/** Сдвигает точку по диагонали на `step`, пока в ней лежит левый верхний угол другого корня (число сдвигов ограничено). */
export function freeRootOrigin(origin: CanvasPoint, roots: readonly RootEntry[], step: number): CanvasPoint {
  let point = origin
  for (let i = 0; i < NEW_ROOT_MAX_SHIFTS && roots.some((root) => isCovered(root, point, step)); i += 1) {
    point = { x: point.x + step, y: point.y + step }
  }
  return point
}
