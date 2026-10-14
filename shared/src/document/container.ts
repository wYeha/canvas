/** Zod-схемы и типы контейнера блока: flex или grid, различаются по полю `kind`. */
import { z } from 'zod'
import { FLEX_ALIGN_VALUES, FLEX_DIRECTIONS, FLEX_JUSTIFY_VALUES, GRID_ALIGN_VALUES } from './constants'

/** Отступ между элементами в px; `null` — не задан и в стили не попадает. */
const gapSchema = z.number().nonnegative().nullable()

/** Flex-контейнер. */
export const flexContainerSchema = z.object({
  kind: z.literal('flex'),
  direction: z.enum(FLEX_DIRECTIONS),
  wrap: z.boolean(),
  justify: z.enum(FLEX_JUSTIFY_VALUES),
  align: z.enum(FLEX_ALIGN_VALUES),
  gap: gapSchema,
})

/** Grid-контейнер: `columns` и `rows` — строки в синтаксисе `grid-template-*`. */
export const gridContainerSchema = z.object({
  kind: z.literal('grid'),
  columns: z.string(),
  rows: z.string(),
  justifyItems: z.enum(GRID_ALIGN_VALUES),
  alignItems: z.enum(GRID_ALIGN_VALUES),
  columnGap: gapSchema,
  rowGap: gapSchema,
})

/**
 * Контейнер блока. Тип блока (flex/grid) определяется `container.kind`, а не типом узла:
 * так переключение flex↔grid меняет только контейнер и сохраняет остальные поля блока.
 */
export const containerSchema = z.discriminatedUnion('kind', [flexContainerSchema, gridContainerSchema])

/** Flex-контейнер. */
export type FlexContainer = z.infer<typeof flexContainerSchema>

/** Grid-контейнер. */
export type GridContainer = z.infer<typeof gridContainerSchema>

/** Контейнер блока: flex или grid. */
export type Container = z.infer<typeof containerSchema>

/** Вид контейнера: `'flex'` или `'grid'`. */
export type ContainerKind = Container['kind']
