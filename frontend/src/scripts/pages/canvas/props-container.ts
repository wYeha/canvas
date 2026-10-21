/** Чистая логика секции «Контейнер»: варианты переключателей, смена типа flex↔grid с переносом значений, повороты иконок. Без Vue. */
import {
  GAP_TOKENS,
  FLEX_ALIGN_VALUES,
  FLEX_DIRECTIONS,
  FLEX_JUSTIFY_VALUES,
  type Container,
  type ContainerKind,
  type FlexContainer,
  type GridContainer,
} from '@shared'
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'
import type { UiSegmentedOption } from '@/scripts/components/ui-segmented/ui-segmented.types'
import { createFlexContainer, createGridContainer } from './factories'

/** Значение `flex-direction`. */
export type FlexDirection = FlexContainer['direction']

/** Значение `justify-content` flex-контейнера. */
export type FlexJustify = FlexContainer['justify']

/** Значение `align-items` flex-контейнера. */
export type FlexAlign = FlexContainer['align']

/** Ось иконки выравнивания: вдоль главной оси (justify) или поперёк (align). */
export type AlignAxis = 'justify' | 'align'

/** Иконки направлений flex. */
const DIRECTION_ICONS: Record<FlexDirection, UiIconName> = {
  row: 'arrow-right',
  column: 'arrow-down',
  'row-reverse': 'arrow-left',
  'column-reverse': 'arrow-up',
}

/** Иконки `justify-content`. */
const JUSTIFY_ICONS: Record<FlexJustify, UiIconName> = {
  'flex-start': 'justify-start',
  center: 'justify-center',
  'flex-end': 'justify-end',
  'space-between': 'justify-between',
  'space-around': 'justify-around',
  'space-evenly': 'justify-evenly',
}

/** Иконки `align-items`. */
const ALIGN_ICONS: Record<FlexAlign, UiIconName> = {
  'flex-start': 'align-start',
  center: 'align-center',
  'flex-end': 'align-end',
  stretch: 'align-stretch',
  baseline: 'align-baseline',
}

/** Соответствие `align` flex → `alignItems` grid; baseline в grid-списке нет, он становится stretch. */
const FLEX_TO_GRID_ALIGN: Record<FlexAlign, GridContainer['alignItems']> = {
  'flex-start': 'start',
  center: 'center',
  'flex-end': 'end',
  stretch: 'stretch',
  baseline: 'stretch',
}

/** Соответствие `alignItems` grid → `align` flex. */
const GRID_TO_FLEX_ALIGN: Record<GridContainer['alignItems'], FlexAlign> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}

/** Допустимые виды контейнера. */
const CONTAINER_KINDS: readonly ContainerKind[] = ['flex', 'grid']

/** Иконочные сегменты по списку значений: подпись — само CSS-значение (идёт в aria-label и title). */
function iconOptions<T extends string>(values: readonly T[], icons: Record<T, UiIconName>): UiSegmentedOption[] {
  return values.map((value) => ({ value, label: value, icon: icons[value] }))
}

/** Сегменты переключателя типа: значок и слово. */
export const KIND_OPTIONS: readonly UiSegmentedOption[] = [
  { value: 'flex', label: 'Flex', icon: 'flex', iconOnly: false },
  { value: 'grid', label: 'Grid', icon: 'grid', iconOnly: false },
]

/** Сегменты `flex-direction`. */
export const DIRECTION_OPTIONS: readonly UiSegmentedOption[] = iconOptions(FLEX_DIRECTIONS, DIRECTION_ICONS)

/** Сегменты `justify-content`. */
export const JUSTIFY_OPTIONS: readonly UiSegmentedOption[] = iconOptions(FLEX_JUSTIFY_VALUES, JUSTIFY_ICONS)

/** Сегменты `align-items`. */
export const ALIGN_OPTIONS: readonly UiSegmentedOption[] = iconOptions(FLEX_ALIGN_VALUES, ALIGN_ICONS)

/** Сужает строку до значения из списка; чужое значение — `null`. */
export function asOneOf<T extends string>(values: readonly T[], value: string | null): T | null {
  return values.find((item) => item === value) ?? null
}

/** Сужает строку до `flex-direction`. */
export function asFlexDirection(value: string | null): FlexDirection | null {
  return asOneOf(FLEX_DIRECTIONS, value)
}

/** Сужает строку до `justify-content`. */
export function asFlexJustify(value: string | null): FlexJustify | null {
  return asOneOf(FLEX_JUSTIFY_VALUES, value)
}

/** Сужает строку до `align-items`. */
export function asFlexAlign(value: string | null): FlexAlign | null {
  return asOneOf(FLEX_ALIGN_VALUES, value)
}

/** Сужает строку до вида контейнера. */
export function asContainerKind(value: string | null): ContainerKind | null {
  return asOneOf(CONTAINER_KINDS, value)
}

/** Переводит flex в grid: align → alignItems, зазор сохраняется, остальное — по умолчанию. */
function flexToGrid(container: FlexContainer): GridContainer {
  const grid: GridContainer = { ...createGridContainer(), alignItems: FLEX_TO_GRID_ALIGN[container.align] }
  return container.gap === undefined ? grid : { ...grid, gap: container.gap }
}

/** Переводит grid во flex: alignItems → align, зазор сохраняется, остальное — по умолчанию. */
function gridToFlex(container: GridContainer): FlexContainer {
  const flex: FlexContainer = { ...createFlexContainer(), align: GRID_TO_FLEX_ALIGN[container.alignItems] }
  return container.gap === undefined ? flex : { ...flex, gap: container.gap }
}

/** Меняет тип контейнера, перенося совместимые значения; тот же тип возвращается как есть. */
export function convertContainer(container: Container, toKind: ContainerKind): Container {
  if (container.kind === toKind) return container
  return container.kind === 'flex' ? flexToGrid(container) : gridToFlex(container)
}

/**
 * Модификатор поворота иконок выравнивания под направление: иконки нарисованы для row.
 * justify: row-reverse зеркалится, column и column-reverse поворачиваются на ±90°;
 * align: поперечная ось у column* горизонтальная, иконка поворачивается; у row* не меняется.
 */
export function iconOrientation(direction: FlexDirection, axis: AlignAxis): string | null {
  if (axis === 'align') return direction.startsWith('column') ? 'cross' : null
  if (direction === 'row-reverse') return 'mirror'
  if (direction === 'column') return 'column'
  return direction === 'column-reverse' ? 'column-reverse' : null
}

/** Контейнер с токеном зазора; `GAP_NONE` и чужое значение стирают поле (вход не меняется). */
export function withGap(container: Container, value: string | null): Container {
  const token = GAP_TOKENS.find((item) => item === value)
  const base: Container = { ...container }
  Reflect.deleteProperty(base, 'gap')
  return token === undefined ? base : { ...base, gap: token }
}
