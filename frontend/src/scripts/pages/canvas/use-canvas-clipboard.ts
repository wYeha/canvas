/**
 * Composable внутреннего копирования блоков (Ctrl+C / Ctrl+V) и переименования (F2): общие функции для хоткеев.
 * Системный буфер обмена не используется.
 */
import { NEW_ROOT_WIDTH } from './constants'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { useNodeClipboardStore } from './node-clipboard-store'
import { newBlockParentId } from './block-create'
import { useCanvasCreate } from './use-canvas-create'

/** Возвращает `copySelected()`, `pasteClipboard()` (оба сообщают, сработали ли) и `renameSelected()`. */
export function useCanvasClipboard() {
  const layoutStore = useLayoutStore()
  const clipboard = useNodeClipboardStore()
  const labelEdit = useLabelEditStore()
  const { newRootPoint } = useCanvasCreate()

  /** Копирует выделенный блок с поддеревом во внутренний буфер; `false`, если выделения нет. */
  function copySelected(): boolean {
    const node = layoutStore.selectedNode
    if (node === undefined) return false
    const rootEntry = layoutStore.rootOf(node.id)
    const isRoot = rootEntry?.node.id === node.id
    clipboard.copy(node, isRoot ? rootEntry.canvas.width : null)
    return true
  }

  /** Вставляет копию из буфера: в выделенный блок последним ребёнком, иначе новым корнем; `false`, если не вышло. */
  function pasteClipboard(): boolean {
    const entry = clipboard.entry
    if (entry === null) return false
    labelEdit.finish()
    const parentId = newBlockParentId(layoutStore.selectedNode)
    if (parentId !== null) return layoutStore.pasteChild(parentId, entry.node) !== null
    return layoutStore.pasteRoot(entry.node, newRootPoint(), entry.rootWidth ?? NEW_ROOT_WIDTH) !== null
  }

  /**
   * Открывает ввод подписи выделенного блока с текущим значением; без выделения — ничего. Поле открывается
   * в строке «Слоёв», если `F2` нажат с фокусом в строке или блок выбран там последним кликом, иначе на канвасе.
   */
  function renameSelected(fromLayers = false): boolean {
    const node = layoutStore.selectedNode
    if (!node) return false
    labelEdit.beginRename(node.id, node.label, fromLayers ? 'layers' : labelEdit.renamePlaceFor(node.id))
    return true
  }

  return { copySelected, pasteClipboard, renameSelected }
}
