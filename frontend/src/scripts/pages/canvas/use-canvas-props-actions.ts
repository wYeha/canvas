/** Composable действий футера панели свойств (в том числе «Вынести на канвас» с замером ширины блока): кнопки (доступность с причиной) и выполнение через хранилище. */
import { computed } from 'vue'
import type { NodeId } from '@shared'
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'
import type { UiButtonVariant } from '@/scripts/components/ui-button/ui-button.types'
import { NODE_ACTIONS } from './constants'
import { useCameraStore } from './camera-store'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { measureNodeWorldRect } from './node-dom'
import { moveTargetFor, nodeActionStates, toCanvasTarget, type NodeActionId } from './node-actions'

/** Кнопка действия для шаблона. */
export interface NodeActionButton {
  id: NodeActionId
  label: string
  icon: UiIconName | undefined
  variant: UiButtonVariant
  disabled: boolean
  /** Причина недоступности для всплывающей подсказки; `undefined`, если действие доступно. */
  title: string | undefined
}

/** Строит кнопки действий выделенного узла и выполняет нажатую. */
export function useCanvasPropsActions() {
  const layoutStore = useLayoutStore()
  const labelEdit = useLabelEditStore()
  const cameraStore = useCameraStore()

  /** Кнопки действий выделенного узла; пусто без выделения. */
  const buttons = computed<NodeActionButton[]>(() => {
    const id = layoutStore.selectedId
    if (id === null) return []
    const states = new Map(nodeActionStates(layoutStore.document, id).map((state) => [state.id, state]))
    return NODE_ACTIONS.flatMap((action) => {
      const state = states.get(action.id)
      if (state === undefined) return []
      return [
        {
          id: action.id,
          label: action.label,
          icon: action.icon ?? undefined,
          variant: action.id === 'delete' ? 'danger' : 'default',
          disabled: state.disabled,
          title: state.reason ?? undefined,
        },
      ]
    })
  })

  /** «Вынести на канвас»: ширина нового корня — замер блока на поле (как у переноса на поле мышью). */
  function extract(id: NodeId): void {
    const rect = measureNodeWorldRect(id, cameraStore.camera.zoom)
    const target = toCanvasTarget(layoutStore.document, id, rect === null ? undefined : Math.round(rect.width))
    if (target !== null) layoutStore.extractToCanvas(id, target)
  }

  /** Выполняет действие над выделенным узлом (кнопка или хоткей); недоступное или без выделения — ничего. */
  function run(action: NodeActionId): void {
    const id = layoutStore.selectedId
    if (id === null) return
    // Та же доступность, что у кнопки: недоступное действие (в том числе по хоткею) не выполняется
    if (nodeActionStates(layoutStore.document, id).find((state) => state.id === action)?.disabled !== false) return
    // Незаконченный ввод подписи применяется до правки структуры
    labelEdit.finish()
    const doc = layoutStore.document
    if (action === 'move-up' || action === 'move-down') {
      const target = moveTargetFor(doc, id, action === 'move-up' ? -1 : 1)
      if (target !== null) layoutStore.moveNode(id, target)
    } else if (action === 'to-canvas') {
      const target = toCanvasTarget(doc, id)
      if (target !== null) layoutStore.moveNode(id, target)
    } else if (action === 'extract') {
      extract(id)
    } else if (action === 'duplicate') {
      layoutStore.duplicateNode(id)
    } else {
      layoutStore.removeNode(id)
    }
  }

  return { buttons, run }
}
