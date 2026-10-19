/**
 * Pinia-хранилище ввода подписи: какой блок сейчас подписывается, черновик текста и где открыто поле — на канвасе
 * или в строке «Слоёв». Состояние интерфейса, не документ: нужно тулбару и хоткеям (начать), полю на канвасе и
 * строке слоя (ввод), панелям (завершить).
 * Два режима: создание (пустое значение и Esc дают автоподпись) и переименование (пустое значение и Esc — откат).
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { isLinkBlock, type NodeId } from '@shared'
import { useLayoutStore } from './layout-store'
import { findNode } from './tree-query'

/** Режим ввода: подпись только что созданного блока или переименование существующего. */
export type LabelEditMode = 'create' | 'rename'

/** Где открыто поле ввода: у блока на канвасе или в строке панели «Слои». */
export type LabelEditPlace = 'canvas' | 'layers'

export const useLabelEditStore = defineStore('label-edit', () => {
  const layoutStore = useLayoutStore()
  /** Id блока, чья подпись вводится; `null` — ввода нет. */
  const editingId = ref<NodeId | null>(null)
  /** Черновик подписи. */
  const draft = ref('')
  /** Режим текущего ввода. */
  const mode = ref<LabelEditMode>('create')
  /** Место текущего ввода. */
  const place = ref<LabelEditPlace>('canvas')
  /** Блок, выбранный последним кликом в «Слоях»: `F2` для него открывает переименование в строке слоя. */
  const layersPickId = ref<NodeId | null>(null)

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
    place.value = 'canvas'
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

  /**
   * Открывает переименование блока с текущей подписью на канвасе или в «Слоях»; предыдущий ввод завершается.
   * У связи своей подписи нет (показывается имя источника) — переименование не открывается.
   */
  function beginRename(id: NodeId, currentLabel: string, where: LabelEditPlace = 'canvas'): void {
    const node = findNode(useLayoutStore().document, id)
    if (node !== undefined && isLinkBlock(node)) return
    finish()
    editingId.value = id
    draft.value = currentLabel
    mode.value = 'rename'
    place.value = where
  }

  /** Запоминает блок, выбранный в «Слоях» (`null` — выбор пришёл с канваса). */
  function pickInLayers(id: NodeId | null): void {
    layersPickId.value = id
  }

  /** Где переименовывать блок по `F2`: в «Слоях», если он выбран там последним кликом, иначе на канвасе. */
  function renamePlaceFor(id: NodeId): LabelEditPlace {
    return layersPickId.value === id ? 'layers' : 'canvas'
  }

  return {
    editingId,
    draft,
    mode,
    place,
    layersPickId,
    begin,
    beginRename,
    finish,
    cancel,
    pickInLayers,
    renamePlaceFor,
  }
})
