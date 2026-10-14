/** Composable секции «Блок»: подпись, описание, тег и padding выделенного блока; запись через экшен стора. */
import { computed, ref, watch, type WritableComputedRef } from 'vue'
import type { BlockNode, NodeId, Padding } from '@shared'
import { useLayoutStore } from './layout-store'
import {
  asLayoutTag,
  initialSidesMode,
  isUniformPadding,
  paddingFromUniform,
  paddingSides,
  paddingWithSide,
  uniformPaddingValue,
  type PaddingSide,
} from './props-block'
import type { NodePatch } from './tree'
import { useBlockTextDraft } from './use-block-text-draft'

/** Возвращает поля секции для шаблона; запись недопустимых значений стор отклоняет сам. */
export function useCanvasPropsBlock() {
  const layoutStore = useLayoutStore()

  /** Выделенный блок (секция показывается только для блока, не для связи). */
  const block = computed<BlockNode | null>(() => {
    const node = layoutStore.selectedNode
    return node?.type === 'block' ? node : null
  })

  /** Правит поля выделенного блока по id; без изменений стор ничего не пишет. */
  function patch(id: NodeId, change: NodePatch): void {
    layoutStore.updateNode(id, change)
  }

  const label = useBlockTextDraft(
    () => (block.value ? { id: block.value.id, value: block.value.label } : null),
    { multiline: false },
    (id, label) => {
      patch(id, { label })
    },
  )
  const description = useBlockTextDraft(
    () => (block.value ? { id: block.value.id, value: block.value.description } : null),
    { multiline: true },
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

  /** Режим «по сторонам»: локальное состояние, при смене блока задаётся заново по равенству сторон. */
  const sidesMode = ref(false)
  watch(
    () => block.value?.id,
    () => {
      sidesMode.value = initialSidesMode(block.value?.padding ?? null)
    },
    { immediate: true },
  )

  /** Переключает режим «по сторонам» (данные не меняются). */
  function toggleSidesMode(): void {
    sidesMode.value = !sidesMode.value
  }

  /** Единое поле padding: общая величина; запись задаёт все 4 стороны. */
  const padding: WritableComputedRef<number | null> = computed({
    /** Читает общую величину сторон; `null`, если padding нет или стороны разные. */
    get: () => uniformPaddingValue(block.value?.padding ?? null),
    /** Пишет все 4 стороны; пусто и 0 дают padding `null`. */
    set: (value) => {
      if (block.value) patch(block.value.id, { padding: paddingFromUniform(value) })
    },
  })

  /** Стороны padding различаются: единое поле пустое и подсказывает об этом. */
  const paddingMixed = computed(() => !isUniformPadding(block.value?.padding ?? null))

  /** Значения четырёх сторон для полей. */
  const sides = computed<Padding>(() => paddingSides(block.value?.padding ?? null))

  /** Пишет одну сторону padding. */
  function setSide(side: PaddingSide, value: number | null): void {
    if (block.value) patch(block.value.id, { padding: paddingWithSide(block.value.padding, side, value) })
  }

  return {
    block,
    label: label.draft,
    applyLabel: label.apply,
    onLabelKeydown: label.onKeydown,
    description: description.draft,
    applyDescription: description.apply,
    onDescriptionKeydown: description.onKeydown,
    tag,
    sidesMode,
    toggleSidesMode,
    padding,
    paddingMixed,
    sides,
    setSide,
  }
}
