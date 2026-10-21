/**
 * Zod-схемы и типы контейнера блока: flex или grid, различаются по полю `kind`. Зазор между детьми — токеном `gap`
 * (s/m/l, без поля — без зазора); числовые `gap`, `columnGap`, `rowGap` документов до 8.4 отбрасываются при разборе.
 */
import { z } from 'zod'
import { isSafeCssValue, UNSAFE_CSS_MESSAGE } from './css-value'
import { FLEX_ALIGN_VALUES, FLEX_DIRECTIONS, FLEX_JUSTIFY_VALUES, GAP_TOKENS, GRID_ALIGN_VALUES } from './constants'

/** Безопасная CSS-строка: без символов, разрывающих декларацию или разметку при экспорте. */
export const safeCssStringSchema = z.string().refine(isSafeCssValue, { message: UNSAFE_CSS_MESSAGE })

/** Flex-контейнер. */
export const flexContainerSchema = z.object({
  kind: z.literal('flex'),
  direction: z.enum(FLEX_DIRECTIONS),
  wrap: z.boolean(),
  justify: z.enum(FLEX_JUSTIFY_VALUES),
  align: z.enum(FLEX_ALIGN_VALUES),
  // Числовой gap документов до 8.4 и любой мусор — без зазора (поле молча отбрасывается)
  gap: z.enum(GAP_TOKENS).optional().catch(undefined),
})

/** Grid-контейнер: `columns` и `rows` — строки в синтаксисе `grid-template-*`. */
export const gridContainerSchema = z.object({
  kind: z.literal('grid'),
  columns: safeCssStringSchema,
  rows: safeCssStringSchema,
  justifyItems: z.enum(GRID_ALIGN_VALUES),
  alignItems: z.enum(GRID_ALIGN_VALUES),
  // Числовой gap документов до 8.4 и любой мусор — без зазора (поле молча отбрасывается)
  gap: z.enum(GAP_TOKENS).optional().catch(undefined),
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
