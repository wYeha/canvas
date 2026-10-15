/**
 * Pinia-хранилище ввода подписи на канвасе: какой блок сейчас подписывается и черновик текста.
 * Состояние интерфейса, не документ: нужно тулбару и хоткеям (начать), полю на канвасе (ввод) и панели (завершить).
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { NodeId } from '@shared'
import { useLayoutStore } from './layout-store'

export const useLabelEditStore = defineStore('label-edit', () => {
  const layoutStore = useLayoutStore()
  /** Id блока, чья подпись вводится; `null` — ввода нет. */
  const editingId = ref<NodeId | null>(null)
  /** Черновик подписи. */
  const draft = ref('')

  /** Применяет черновик к блоку (пустой — автоподпись `Блок-N`) и закрывает ввод; без активного ввода ничего не делает. */
  function finish(): void {
    const id = editingId.value
    if (id === null) return
    const text = draft.value
    editingId.value = null
    draft.value = ''
    layoutStore.setLabelOrAuto(id, text)
  }

  /** Esc: отказ от ввода равен пустому значению, то есть автоподпись. */
  function cancel(): void {
    draft.value = ''
    finish()
  }

  /** Открывает ввод подписи нового блока; предыдущий ввод, если он был, завершается. */
  function begin(id: NodeId): void {
    finish()
    editingId.value = id
    draft.value = ''
  }

  return { editingId, draft, begin, finish, cancel }
})
