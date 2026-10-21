/**
 * Composable секции «Как ребёнок»: режимы ширины и высоты (авто / заполнить / фиксированный с необязательным числом),
 * span, повтор и «Дополнительно» (свободный flex, min/max-width, min-height); запись `self` заменяет его целиком.
 */
import { computed, ref, watch, type ComputedRef, type WritableComputedRef } from 'vue'
import type { ContainerKind, LayoutNode, NodeId, SelfProps } from '@shared'
import { CHILD_SIZE_MODE_HINTS } from './constants'
import { useLayoutStore } from './layout-store'
import {
  displayChildFlex,
  normalizeChildFlex,
  normalizeChildSize,
  normalizeRepeat,
  withSelfSpan,
  withSelfText,
  type SelfSpanKey,
  type SelfTextKey,
} from './props-child'
import { mainAxis, sizeMode, withSizeMode, withSizeValue, type SizeAxis, type SizeMode } from './size-mode'
import { findNode, findParent } from './tree-query'
import { useBlockTextDraft } from './use-block-text-draft'

/** Задано ли что-то из «Дополнительно»: min/max-width, min-height или свободный flex (не по умолчанию). */
function hasAdvanced(self: SelfProps): boolean {
  const limits = [self.minWidth, self.maxWidth, self.minHeight].some((value) => value !== undefined)
  return limits || displayChildFlex(self.flex) !== displayChildFlex(undefined)
}

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
  function textField(
    key: SelfTextKey,
    normalize: (value: string) => string | null,
    show: (value: string | undefined) => string = (value) => value ?? '',
  ) {
    return useBlockTextDraft(
      () => (node.value ? { id: node.value.id, value: show(node.value.self[key]) } : null),
      { multiline: false, normalize },
      (id, value) => {
        writeSelf(id, (self) => withSelfText(self, key, value))
      },
    )
  }

  const flexCustom = textField('flex', normalizeChildFlex, displayChildFlex)
  const minWidth = textField('minWidth', normalizeChildSize)
  const maxWidth = textField('maxWidth', normalizeChildSize)
  const minHeight = textField('minHeight', normalizeChildSize)

  /** Ось — главная ось flex-родителя (там «Заполнить» — это flex, а не растяжение). */
  function isMain(axis: SizeAxis): boolean {
    const container = parent.value?.container
    return container?.kind === 'flex' && mainAxis(container.direction) === axis
  }

  /** Режим размера по оси (сегменты); запись меняет режим, у «Авто» и «Заполнить» число стирается. */
  function modeField(axis: SizeAxis): WritableComputedRef<SizeMode | null> {
    return computed({
      /** Читает режим из документа. */
      get: () => (node.value ? sizeMode(node.value.self, axis) : null),
      /** Пишет режим. */
      set: (mode) => {
        if (node.value && mode !== null)
          writeSelf(node.value.id, (self) => withSizeMode(self, axis, mode, isMain(axis)))
      },
    })
  }

  /** Число фиксированного размера (черновик, Enter/blur); пустое — фиксированный без числа. */
  function valueField(axis: SizeAxis) {
    return useBlockTextDraft(
      () => (node.value ? { id: node.value.id, value: node.value.self[axis] ?? '' } : null),
      { multiline: false, normalize: normalizeChildSize },
      (id, value) => {
        writeSelf(id, (self) => withSizeValue(self, axis, value))
      },
    )
  }

  /** Подсказка под режимом: что он даст в экспорте (у «Заполнить» — по оси родителя). */
  function modeHint(axis: SizeAxis, mode: ComputedRef<SizeMode | null>): ComputedRef<string> {
    return computed(() => {
      if (mode.value === 'content' || mode.value === null) return CHILD_SIZE_MODE_HINTS.content
      if (mode.value === 'fixed') return CHILD_SIZE_MODE_HINTS.fixed
      if (gridParent.value) return CHILD_SIZE_MODE_HINTS.fillGrid
      return isMain(axis) ? CHILD_SIZE_MODE_HINTS.fillMain : CHILD_SIZE_MODE_HINTS.fillCross
    })
  }

  const widthMode = modeField('width')
  const heightMode = modeField('height')
  const widthValue = valueField('width')
  const heightValue = valueField('height')

  /** Раскрывашка «Дополнительно»: открыта, если у блока задано что-то из неё (при смене выделения). */
  const advancedOpen = ref(false)
  watch(
    () => node.value?.id,
    () => {
      advancedOpen.value = node.value !== null && hasAdvanced(node.value.self)
    },
    { immediate: true },
  )

  /** Быстрое значение `flex`: у пустого значения показывается `0 1 auto`; применяется сразу. */
  const flexPreset: WritableComputedRef<string | null> = computed({
    /** Читает текущее значение `flex` (не задано — значение по умолчанию). */
    get: () => (node.value ? displayChildFlex(node.value.self.flex) : null),
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

  /** Поле «Повтор»: целое 1…`REPEAT_MAX`; правка — через `updateNode` (склейка истории по полю `repeat`). */
  const repeat: WritableComputedRef<number | null> = computed({
    /** Читает число повторов из документа. */
    get: () => node.value?.repeat ?? null,
    /** Пишет нормализованное число повторов; то же значение документ не меняет. */
    set: (value) => {
      if (node.value) layoutStore.updateNode(node.value.id, { repeat: normalizeRepeat(value) })
    },
  })

  return {
    node,
    flexParent,
    gridParent,
    flexPreset,
    flexCustom: flexCustom.draft,
    flexError: flexCustom.error,
    applyFlex: flexCustom.apply,
    onFlexKeydown: flexCustom.onKeydown,
    widthMode,
    heightMode,
    widthHint: modeHint('width', widthMode),
    heightHint: modeHint('height', heightMode),
    widthValue: widthValue.draft,
    widthValueError: widthValue.error,
    applyWidthValue: widthValue.apply,
    onWidthValueKeydown: widthValue.onKeydown,
    heightValue: heightValue.draft,
    heightValueError: heightValue.error,
    applyHeightValue: heightValue.apply,
    onHeightValueKeydown: heightValue.onKeydown,
    minWidth: minWidth.draft,
    minWidthError: minWidth.error,
    applyMinWidth: minWidth.apply,
    onMinWidthKeydown: minWidth.onKeydown,
    maxWidth: maxWidth.draft,
    maxWidthError: maxWidth.error,
    applyMaxWidth: maxWidth.apply,
    onMaxWidthKeydown: maxWidth.onKeydown,
    advancedOpen,
    minHeight: minHeight.draft,
    minHeightError: minHeight.error,
    applyMinHeight: minHeight.apply,
    onMinHeightKeydown: minHeight.onKeydown,
    colSpan: spanField('colSpan'),
    rowSpan: spanField('rowSpan'),
    repeat,
  }
}
