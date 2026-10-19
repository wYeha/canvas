/** Composable секции «Как ребёнок»: flex/width/height/min-height через черновики, span и быстрые значения flex; запись заменяет `self` целиком. */
import { computed, type WritableComputedRef } from 'vue'
import type { ContainerKind, LayoutNode, NodeId, SelfProps } from '@shared'
import { useLayoutStore } from './layout-store'
import {
  normalizeChildFlex,
  normalizeChildSize,
  withSelfSpan,
  withSelfText,
  type SelfSpanKey,
  type SelfTextKey,
} from './props-child'
import { findNode, findParent } from './tree-query'
import { useBlockTextDraft } from './use-block-text-draft'

/** Возвращает поля секции для шаблона; блока без родителя (корня) здесь нет — секцию не показывают. */
export function useCanvasPropsChild() {
  const layoutStore = useLayoutStore()

  /** Родитель выделенного узла; `undefined` у корня или без выделения. */
  const parent = computed(() => {
    const selected = layoutStore.selectedNode
    return selected ? findParent(layoutStore.document, selected.id) : undefined
  })

  /** Выделенный блок с родителем; у корня — `null`. */
  const node = computed<LayoutNode | null>(() => (parent.value ? (layoutStore.selectedNode ?? null) : null))

  /** Вид контейнера родителя: определяет, какие поля показывать. */
  const parentKind = computed<ContainerKind | null>(() => parent.value?.container.kind ?? null)

  const flexParent = computed(() => parentKind.value === 'flex')
  const gridParent = computed(() => parentKind.value === 'grid')

  /** Заменяет `self` узла по id целиком (так стираются необязательные ключи). */
  function writeSelf(id: NodeId, change: (self: SelfProps) => SelfProps): void {
    const target = findNode(layoutStore.document, id)
    if (target) layoutStore.updateNode(id, { self: change(target.self) })
  }

  /** Текстовое поле с черновиком, Enter/blur и валидацией. */
  function textField(key: SelfTextKey, normalize: (value: string) => string | null) {
    return useBlockTextDraft(
      () => (node.value ? { id: node.value.id, value: node.value.self[key] ?? '' } : null),
      { multiline: false, normalize },
      (id, value) => {
        writeSelf(id, (self) => withSelfText(self, key, value))
      },
    )
  }

  const flexCustom = textField('flex', normalizeChildFlex)
  const width = textField('width', normalizeChildSize)
  const height = textField('height', normalizeChildSize)
  const minHeight = textField('minHeight', normalizeChildSize)

  /** Быстрое значение `flex`: пустая строка — «не задано»; применяется сразу. */
  const flexPreset: WritableComputedRef<string | null> = computed({
    /** Читает текущее значение `flex` (пусто, если не задано). */
    get: () => (node.value ? (node.value.self.flex ?? '') : null),
    /** Пишет значение сразу в документ. */
    set: (value) => {
      if (node.value && value !== null) writeSelf(node.value.id, (self) => withSelfText(self, 'flex', value))
    },
  })

  /** Поле span (целое ≥ 1; пусто или 1 — не задан). */
  function spanField(key: SelfSpanKey): WritableComputedRef<number | null> {
    return computed({
      /** Читает span из документа. */
      get: () => node.value?.self[key] ?? null,
      /** Пишет span, лишнее стирается. */
      set: (value) => {
        if (node.value) writeSelf(node.value.id, (self) => withSelfSpan(self, key, value))
      },
    })
  }

  return {
    node,
    flexParent,
    gridParent,
    flexPreset,
    flexCustom: flexCustom.draft,
    flexError: flexCustom.error,
    applyFlex: flexCustom.apply,
    onFlexKeydown: flexCustom.onKeydown,
    width: width.draft,
    widthError: width.error,
    applyWidth: width.apply,
    onWidthKeydown: width.onKeydown,
    height: height.draft,
    heightError: height.error,
    applyHeight: height.apply,
    onHeightKeydown: height.onKeydown,
    minHeight: minHeight.draft,
    minHeightError: minHeight.error,
    applyMinHeight: minHeight.apply,
    onMinHeightKeydown: minHeight.onKeydown,
    colSpan: spanField('colSpan'),
    rowSpan: spanField('rowSpan'),
  }
}
