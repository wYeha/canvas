/**
 * Zod-схемы и типы контейнера блока: flex или grid, различаются по полю `kind`. Зазор между детьми — токеном `gap`
 * (s/m/l, без поля — без зазора); числовые `gap`, `columnGap`, `rowGap` документов до 8.4 отбрасываются при разборе.
 * Прокрутка содержимого — `scroll` (общая для flex и grid, как и зазор).
 */
import { z } from 'zod'
import { isSafeCssValue, UNSAFE_CSS_MESSAGE } from './css-value'
import {
  FLEX_ALIGN_VALUES,
  FLEX_DIRECTIONS,
  FLEX_JUSTIFY_VALUES,
  GAP_TOKENS,
  GRID_ALIGN_VALUES,
  NARROW_COLUMNS_MAX,
  NARROW_STEPS_MAX,
  SCROLL_AXES,
} from './constants'

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
  /** Прокрутка содержимого (15.2): `y` — по вертикали, `x` — по горизонтали; нет поля — не прокручивается. */
  scroll: z.enum(SCROLL_AXES).optional().catch(undefined),
})

/** Grid-контейнер: `columns` и `rows` — строки в синтаксисе `grid-template-*`. */
export const gridContainerSchema = z.object({
  kind: z.literal('grid'),
  columns: safeCssStringSchema,
  rows: safeCssStringSchema,
  justifyItems: z.enum(GRID_ALIGN_VALUES),
  alignItems: z.enum(GRID_ALIGN_VALUES),
  /**
   * Колонки на узких экранах (15.5): по шагам сужения, например `[2, 1]` к `repeat(3, 1fr)` — «3 → 2 → 1». В экспорт
   * идёт комментарием-намерением (инлайн-стили не умеют media-запросы). Битое значение отбрасывается.
   */
  narrowColumns: z
    .array(z.int().min(1).max(NARROW_COLUMNS_MAX))
    .min(1)
    .max(NARROW_STEPS_MAX)
    .optional()
    .catch(undefined),
  // Числовой gap документов до 8.4 и любой мусор — без зазора (поле молча отбрасывается)
  gap: z.enum(GAP_TOKENS).optional().catch(undefined),
  /** Прокрутка содержимого (15.2): `y` — по вертикали, `x` — по горизонтали; нет поля — не прокручивается. */
  scroll: z.enum(SCROLL_AXES).optional().catch(undefined),
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

/** Ось прокрутки содержимого: `'y'` или `'x'`. */
export type ScrollAxis = NonNullable<Container['scroll']>

/** Вид контейнера: `'flex'` или `'grid'`. */
export type ContainerKind = Container['kind']
