/**
 * Pinia-хранилище ввода подписи на канвасе: какой блок сейчас подписывается и черновик текста.
 * Состояние интерфейса, не документ: нужно тулбару и хоткеям (начать), полю на канвасе (ввод) и панели (завершить).
 * Два режима: создание (пустое значение и Esc дают автоподпись) и переименование (пустое значение и Esc — откат).
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { NodeId } from '@shared'
import { useLayoutStore } from './layout-store'

/** Режим ввода: подпись только что созданного блока или переименование существующего. */
export type LabelEditMode = 'create' | 'rename'

export const useLabelEditStore = defineStore('label-edit', () => {
  const layoutStore = useLayoutStore()
  /** Id блока, чья подпись вводится; `null` — ввода нет. */
  const editingId = ref<NodeId | null>(null)
  /** Черновик подписи. */
  const draft = ref('')
  /** Режим текущего ввода. */
  const mode = ref<LabelEditMode>('create')

  /**
   * Применяет черновик и закрывает ввод; без активного ввода ничего не делает. При создании пустой черновик
   * даёт автоподпись `Блок-N`, при переименовании — откат (пустая подпись не допускается, автоподпись только для нового блока).
   */
  function finish(): void {
    const id = editingId.value
    if (id === null) return
    const text = draft.value
    const renaming = mode.value === 'rename'
    editingId.value = null
    draft.value = ''
    mode.value = 'create'
    if (renaming) {
      if (text.trim() !== '') layoutStore.updateNode(id, { label: text.trim() })
      return
    }
    layoutStore.setLabelOrAuto(id, text)
  }

  /** Esc: при создании отказ от ввода равен пустому значению (автоподпись), при переименовании — откат без записи. */
  function cancel(): void {
    draft.value = ''
    finish()
  }

  /** Открывает ввод подписи нового блока; предыдущий ввод, если он был, завершается. */
  function begin(id: NodeId): void {
    finish()
    editingId.value = id
    draft.value = ''
    mode.value = 'create'
  }

  /** Открывает переименование блока с текущей подписью; предыдущий ввод завершается. */
  function beginRename(id: NodeId, currentLabel: string): void {
    finish()
    editingId.value = id
    draft.value = currentLabel
    mode.value = 'rename'
  }

  return { editingId, draft, mode, begin, beginRename, finish, cancel }
})
