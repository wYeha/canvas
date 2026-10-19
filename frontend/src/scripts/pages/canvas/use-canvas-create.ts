/**
 * Composable создания блоков (кнопки тулбара и хоткеи F/G): выбирает родителя или точку на поле, создаёт блок
 * через хранилище и открывает ввод подписи.
 */
import type { ContainerKind } from '@shared'
import { centeredRootOrigin, freeRootOrigin, newBlockParentId, rootShiftStep } from './block-create'
import { useCameraStore } from './camera-store'
import { NEW_ROOT_WIDTH } from './constants'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'

/** Возвращает `createBlock(kind)` (блок в выделенный блок либо новый корень в центре видимой области) и `newRootPoint()`. */
export function useCanvasCreate() {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const labelEdit = useLabelEditStore()

  /** Точка нового корня: центр видимой области, со сдвигом, если там уже лежит другой корень. */
  function newRootPoint() {
    const { camera, visibleArea } = cameraStore
    const origin = centeredRootOrigin(camera, visibleArea, NEW_ROOT_WIDTH)
    return freeRootOrigin(origin, layoutStore.document.roots, rootShiftStep(camera.zoom))
  }

  /** Создаёт блок, выделяет его и открывает ввод подписи; сначала завершает незаконченный ввод предыдущей подписи. */
  function createBlock(kind: ContainerKind): void {
    labelEdit.finish()
    const parentId = newBlockParentId(layoutStore.document, layoutStore.selectedNode)
    const id =
      parentId === null
        ? layoutStore.createRoot(kind, newRootPoint(), NEW_ROOT_WIDTH)
        : layoutStore.createChild(parentId, kind)
    if (id !== null) labelEdit.begin(id)
  }

  return { createBlock, newRootPoint }
}
