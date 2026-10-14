/** Zod-схемы и типы узлов дерева: блок (с детьми) и плашка связи, плюс их общие части. */
import { z } from 'zod'
import { LAYOUT_TAGS } from './constants'
import { containerSchema, safeCssStringSchema } from './container'

/** Идентификатор узла или документа: непустая строка. */
export const nodeIdSchema = z.string().min(1)

/** Семантический тег блока. */
export const layoutTagSchema = z.enum(LAYOUT_TAGS)

/** Свойства «как ребёнок»: место и размер узла в родителе. Заданы только те, что выбрал пользователь. */
export const selfPropsSchema = z.object({
  flex: safeCssStringSchema.optional(),
  width: safeCssStringSchema.optional(),
  height: safeCssStringSchema.optional(),
  minHeight: safeCssStringSchema.optional(),
  colSpan: z.int().min(1).optional(),
  rowSpan: z.int().min(1).optional(),
})

/** Внутренние отступы блока по сторонам, в px. */
export const paddingSchema = z.object({
  top: z.number().min(0),
  right: z.number().min(0),
  bottom: z.number().min(0),
  left: z.number().min(0),
})

/**
 * Плашка связи: место, куда при экспорте подставляется корневой блок-источник.
 * Режим (вложение или слияние) вычисляется по подписям и не хранится.
 */
export const linkNodeSchema = z.object({
  id: nodeIdSchema,
  type: z.literal('link'),
  sourceId: nodeIdSchema,
  self: selfPropsSchema,
})

/** Блок: flex- или grid-контейнер с детьми. Цвет не хранится — он вычисляется по глубине при рендере. */
export const blockNodeSchema = z.object({
  id: nodeIdSchema,
  type: z.literal('block'),
  label: z.string(),
  description: z.string(),
  tag: layoutTagSchema,
  container: containerSchema,
  self: selfPropsSchema,
  padding: paddingSchema.nullable(),
  repeat: z.int().min(1),
  /** Дети блока; геттер нужен zod 4 для рекурсивной схемы (ссылка на ещё не объявленную `layoutNodeSchema`). */
  get children(): z.ZodArray<typeof layoutNodeSchema> {
    return z.array(layoutNodeSchema)
  },
})

/** Любой узел дерева: блок или плашка связи. */
export const layoutNodeSchema = z.discriminatedUnion('type', [blockNodeSchema, linkNodeSchema])

/** Идентификатор узла или документа. */
export type NodeId = z.infer<typeof nodeIdSchema>

/** Семантический тег блока. */
export type LayoutTag = z.infer<typeof layoutTagSchema>

/** Свойства «как ребёнок». */
export type SelfProps = z.infer<typeof selfPropsSchema>

/** Внутренние отступы блока. */
export type Padding = z.infer<typeof paddingSchema>

/** Плашка связи. */
export type LinkNode = z.infer<typeof linkNodeSchema>

/** Блок с детьми. */
export type BlockNode = z.infer<typeof blockNodeSchema>

/** Узел дерева: блок или плашка связи. */
export type LayoutNode = z.infer<typeof layoutNodeSchema>
