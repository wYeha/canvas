/**
 * Composable копирования блоков (Ctrl+C / Ctrl+V) и переименования (F2): общие функции для хоткеев.
 * Копирование собирает фрагмент (поддерево и корни-источники его связей) — его текст пишется в системный буфер
 * обмена (17.4), а сам фрагмент — во внутренний буфер как запасной. Вставка берёт фрагмент из текста системного
 * буфера (проверка zod-схемой), а если там чужой текст или текста нет — из внутреннего буфера.
 */
import { parseFragment, type LayoutFragment } from '@shared'
import { useToastStore } from '@/scripts/globals/toast-store'
import { buildFragment, serializeFragment } from './clipboard-fragment'
import { NEW_ROOT_WIDTH } from './constants'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { useNodeClipboardStore } from './node-clipboard-store'
import { newBlockParentId } from './block-create'
import { useCanvasCreate } from './use-canvas-create'

/** Возвращает `copySelected()`, `pasteClipboard()` и `renameSelected()`. */
export function useCanvasClipboard() {
  const layoutStore = useLayoutStore()
  const clipboard = useNodeClipboardStore()
  const labelEdit = useLabelEditStore()
  const toast = useToastStore()
  const { newRootPoint } = useCanvasCreate()

  /**
   * Копирует выделенный блок с поддеревом: фрагмент во внутренний буфер, его текст — результат для системного
   * буфера. Без выделения — `null`.
   */
  function copySelected(): string | null {
    const node = layoutStore.selectedNode
    if (node === undefined) return null
    const rootEntry = layoutStore.rootOf(node.id)
    const isRoot = rootEntry?.node.id === node.id
    const fragment = buildFragment(layoutStore.document, node, isRoot ? rootEntry.canvas.width : null)
    clipboard.copy(fragment)
    return serializeFragment(fragment)
  }

  /** Вставляет фрагмент: в выделенный блок последним ребёнком, иначе новым корнем; `false`, если не вышло. */
  function pasteFragment(fragment: LayoutFragment): boolean {
    labelEdit.finish()
    const parentId = newBlockParentId(layoutStore.document, layoutStore.selectedNode)
    const width = fragment.rootWidth ?? NEW_ROOT_WIDTH
    return layoutStore.pasteFragment(fragment, parentId, newRootPoint(), width) !== null
  }

  /**
   * Вставка по тексту системного буфера `text` (`null` — прочитать не удалось): наш фрагмент — вставляется; битый
   * фрагмент — сообщение об ошибке; чужой текст или его нет — запасной внутренний буфер. `true`, если вставка
   * обработана (в том числе ошибкой) — тогда браузерную вставку надо отменить.
   */
  function pasteClipboard(text: string | null = null): boolean {
    const parsed = text === null ? null : parseFragment(text)
    if (parsed?.kind === 'fragment') return pasteFragment(parsed.fragment)
    if (parsed?.kind === 'invalid') {
      toast.show(parsed.error)
      return true
    }
    return clipboard.entry !== null && pasteFragment(clipboard.entry)
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
