/** Zod-схемы и типы узлов дерева: блок с детьми и его части; старые плашки и поле `padding` отбрасываются при разборе. */
import { z } from 'zod'
import { LAYOUT_TAGS, LEGACY_LINK_NODE_TYPE } from './constants'
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

/** Узел-плашка старого формата: объект с `type`, равным `LEGACY_LINK_NODE_TYPE`. */
function isLegacyLinkNode(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === LEGACY_LINK_NODE_TYPE
}

/** Миграция при разборе: убирает из списка детей узлы-плашки старых документов; прочие данные не трогает. */
function dropLegacyLinkNodes(value: unknown): unknown {
  return Array.isArray(value) ? value.filter((item) => !isLegacyLinkNode(item)) : value
}

/**
 * Блок: flex- или grid-контейнер с детьми. Цвет не хранится — он вычисляется по глубине при рендере.
 * Внутренних отступов в модели нет (8.2): поле `padding` старых документов не описано в схеме,
 * а `z.object` по умолчанию отбрасывает неизвестные ключи — так оно молча исчезает при разборе.
 */
export const blockNodeSchema = z.object({
  id: nodeIdSchema,
  type: z.literal('block'),
  label: z.string(),
  description: z.string(),
  tag: layoutTagSchema,
  container: containerSchema,
  self: selfPropsSchema,
  repeat: z.int().min(1),
  /** Дети блока; геттер нужен zod 4 для рекурсивной схемы. Плашки старых документов отбрасываются до проверки. */
  get children(): z.ZodPreprocess<z.ZodArray<typeof blockNodeSchema>> {
    return z.preprocess(dropLegacyLinkNodes, z.array(blockNodeSchema))
  },
})

/** Идентификатор узла или документа. */
export type NodeId = z.infer<typeof nodeIdSchema>

/** Семантический тег блока. */
export type LayoutTag = z.infer<typeof layoutTagSchema>

/** Свойства «как ребёнок». */
export type SelfProps = z.infer<typeof selfPropsSchema>

/** Блок с детьми. */
export type BlockNode = z.infer<typeof blockNodeSchema>

/** Узел дерева; других видов узлов, кроме блока, нет. */
export type LayoutNode = BlockNode
