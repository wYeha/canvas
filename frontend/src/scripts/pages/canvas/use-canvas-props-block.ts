/** Composable секции «Блок»: подпись, описание и тег выделенного блока; запись через экшен стора. */
import { computed, type WritableComputedRef } from 'vue'
import type { BlockNode, NodeId } from '@shared'
import { useLayoutStore } from './layout-store'
import { asLayoutTag } from './props-block'
import type { NodePatch } from './tree'
import { useBlockTextDraft } from './use-block-text-draft'

/** Возвращает поля секции для шаблона; запись недопустимых значений стор отклоняет сам. */
export function useCanvasPropsBlock() {
  const layoutStore = useLayoutStore()

  /** Выделенный блок; `null` без выделения. */
  const block = computed<BlockNode | null>(() => {
    const node = layoutStore.selectedNode
    return node ?? null
  })

  /** Правит поля выделенного блока по id; без изменений стор ничего не пишет. */
  function patch(id: NodeId, change: NodePatch): void {
    layoutStore.updateNode(id, change)
  }

  const label = useBlockTextDraft(
    () => (block.value ? { id: block.value.id, value: block.value.label } : null),
    { multiline: false, live: true },
    (id, label) => {
      patch(id, { label })
    },
  )
  const description = useBlockTextDraft(
    () => (block.value ? { id: block.value.id, value: block.value.description } : null),
    { multiline: true, live: true },
    (id, description) => {
      patch(id, { description })
    },
  )

  /** Семантический тег. */
  const tag: WritableComputedRef<string | null> = computed({
    /** Читает тег из документа. */
    get: () => block.value?.tag ?? null,
    /** Пишет тег; чужое значение игнорируется. */
    set: (value) => {
      const next = asLayoutTag(value)
      if (block.value && next !== null) patch(block.value.id, { tag: next })
    },
  })

  return {
    block,
    label: label.draft,
    applyLabel: label.apply,
    onLabelKeydown: label.onKeydown,
    description: description.draft,
    applyDescription: description.apply,
    onDescriptionKeydown: description.onKeydown,
    tag,
  }
}
