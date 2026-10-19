/** Composable секции «Контейнер»: тип, flex-поля и (через use-canvas-props-container-grid) grid-поля выделенного блока; запись через экшен стора. */
import { computed, type ComputedRef, type WritableComputedRef } from 'vue'
import type { BlockNode, FlexContainer } from '@shared'
import { useLayoutStore } from './layout-store'
import {
  asContainerKind,
  asFlexAlign,
  asFlexDirection,
  asFlexJustify,
  convertContainer,
  iconOrientation,
  type AlignAxis,
} from './props-container'
import { useCanvasPropsContainerGrid } from './use-canvas-props-container-grid'

/** Базовый BEM-класс группы иконок выравнивания (модификаторы поворота добавляются к нему). */
const ICONS_CLASS = 'canvas-props-container__icons'

/** Возвращает поля секции для шаблона; значения вне перечислений игнорируются. */
export function useCanvasPropsContainer() {
  const layoutStore = useLayoutStore()

  /** Выделенный блок (секция показывается только для блока). */
  const block = computed<BlockNode | null>(() => {
    const node = layoutStore.selectedNode
    return node ?? null
  })

  /** Flex-контейнер выделенного блока; у grid — `null`. */
  const flex = computed<FlexContainer | null>(() =>
    block.value?.container.kind === 'flex' ? block.value.container : null,
  )

  /** Правит flex-поля текущего блока; у grid-блока ничего не делает. */
  function patchFlex(change: Partial<Omit<FlexContainer, 'kind'>>): void {
    if (block.value && flex.value) layoutStore.updateNode(block.value.id, { container: { ...flex.value, ...change } })
  }

  /** Перечислимое поле flex как записываемое вычисляемое: чтение и запись только допустимых значений. */
  function flexField<K extends 'direction' | 'justify' | 'align'>(
    key: K,
    parse: (value: string | null) => FlexContainer[K] | null,
  ): WritableComputedRef<string | null> {
    return computed({
      /** Читает значение из документа. */
      get: () => flex.value?.[key] ?? null,
      /** Пишет значение, если оно из перечисления. */
      set: (value) => {
        const next = parse(value)
        if (next !== null) patchFlex({ [key]: next })
      },
    })
  }

  /** Тип контейнера: flex или grid; смена переносит совместимые значения. */
  const kind: WritableComputedRef<string | null> = computed({
    /** Читает тип из документа. */
    get: () => block.value?.container.kind ?? null,
    /** Пишет тип через `convertContainer`. */
    set: (value) => {
      const next = asContainerKind(value)
      if (block.value && next !== null) {
        layoutStore.updateNode(block.value.id, { container: convertContainer(block.value.container, next) })
      }
    },
  })

  /** Перенос строк. */
  const wrap: WritableComputedRef<boolean> = computed({
    /** Читает флаг переноса. */
    get: () => flex.value?.wrap ?? false,
    /** Пишет флаг переноса. */
    set: (value) => {
      patchFlex({ wrap: value })
    },
  })

  /** Классы группы иконок выравнивания: базовый и модификатор поворота под текущее направление. */
  function iconClasses(axis: AlignAxis): ComputedRef<string[]> {
    return computed(() => {
      const modifier = flex.value ? iconOrientation(flex.value.direction, axis) : null
      return modifier ? [ICONS_CLASS, `${ICONS_CLASS}--${modifier}`] : [ICONS_CLASS]
    })
  }

  return {
    ...useCanvasPropsContainerGrid(block),
    block,
    flex,
    kind,
    direction: flexField('direction', asFlexDirection),
    wrap,
    justify: flexField('justify', asFlexJustify),
    align: flexField('align', asFlexAlign),
    justifyClasses: iconClasses('justify'),
    alignClasses: iconClasses('align'),
  }
}
