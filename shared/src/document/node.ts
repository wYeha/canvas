/** Zod-схемы и типы узлов дерева: блок с детьми и его части, связь — блок с `sourceId`; старые плашки становятся связями. */
import { z } from 'zod'
import {
  CHILD_POSITIONS,
  ELEMENT_NAME_MAX_LENGTH,
  ELEMENT_NAME_PATTERN,
  LAYOUT_TAGS,
  LEGACY_LINK_BLOCK_DEFAULTS,
  LEGACY_LINK_NODE_TYPE,
  SIZE_MODES,
} from './constants'
import { containerSchema, safeCssStringSchema } from './container'

/** Идентификатор узла или документа: непустая строка. */
export const nodeIdSchema = z.string().min(1)

/** Семантический тег блока. */
export const layoutTagSchema = z.enum(LAYOUT_TAGS)

/** Свойства «как ребёнок»: место и размер узла в родителе. Заданы только те, что выбрал пользователь. */
export const selfPropsSchema = z.object({
  flex: safeCssStringSchema.optional(),
  /** Режим ширины: заполнить или фиксированная; нет поля — по содержимому, а заданное `width` — фиксированная с числом. */
  widthMode: z.enum(SIZE_MODES).optional(),
  /** Режим высоты — как `widthMode`, с полем `height`. */
  heightMode: z.enum(SIZE_MODES).optional(),
  width: safeCssStringSchema.optional(),
  height: safeCssStringSchema.optional(),
  minWidth: safeCssStringSchema.optional(),
  maxWidth: safeCssStringSchema.optional(),
  minHeight: safeCssStringSchema.optional(),
  colSpan: z.int().min(1).optional(),
  rowSpan: z.int().min(1).optional(),
  /** Положение в родителе: прилипание или поверх родителя в углу; нет поля — обычный поток. Мусор отбрасывается. */
  position: z.enum(CHILD_POSITIONS).optional().catch(undefined),
})

/** Узел-плашка старого формата (до 8.1): объект с `type`, равным `LEGACY_LINK_NODE_TYPE`. */
function isLegacyLinkNode(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === LEGACY_LINK_NODE_TYPE
}

/**
 * Превращает плашку старого формата `{ id, type: 'link', sourceId, self }` в блок-связь: блок с тем же id,
 * `sourceId` и `self`, без детей; остальные поля — значения по умолчанию. Битые поля отсеет схема блока.
 */
function legacyLinkToBlock(value: Record<string, unknown>): Record<string, unknown> {
  return {
    ...LEGACY_LINK_BLOCK_DEFAULTS,
    container: { ...LEGACY_LINK_BLOCK_DEFAULTS.container },
    id: value.id,
    sourceId: value.sourceId,
    self: value.self ?? {},
    repeat: value.repeat ?? LEGACY_LINK_BLOCK_DEFAULTS.repeat,
    children: [],
  }
}

/** Миграция при разборе: плашки старых документов в списке детей становятся блоками-связями; прочее не трогается. */
function migrateLegacyLinkNodes(value: unknown): unknown {
  return Array.isArray(value) ? value.map((item) => (isLegacyLinkNode(item) ? legacyLinkToBlock(item) : item)) : value
}

/**
 * Блок: flex- или grid-контейнер с детьми. Цвет не хранится — он вычисляется по глубине при рендере.
 * Внутренних отступов и gap в модели нет (8.2, 8.4): неизвестные ключи старых документов `z.object` отбрасывает.
 *
 * Связь — блок с `sourceId`: на его месте при экспорте стоит корневой блок-источник (вложение), а свойства
 * «как ребёнок» и повтор — его собственные (принадлежат месту, а не источнику). Детей у связи нет, контейнер, тег,
 * подпись и описание не используются. Целостность (источник существует, нет циклов) проверяет схема документа.
 */
export const blockNodeSchema = z.object({
  id: nodeIdSchema,
  type: z.literal('block'),
  label: z.string(),
  description: z.string(),
  tag: layoutTagSchema,
  /**
   * Смысловой элемент (15.4): `h1`, `button`, `img`, `li`… — у листа экспорт ставит его тегом (если можно), иначе
   * пишет в начало комментария. Раскладочный `tag` не меняет. Нет поля — не задан; битое значение отбрасывается.
   */
  element: z.string().max(ELEMENT_NAME_MAX_LENGTH).regex(ELEMENT_NAME_PATTERN).optional().catch(undefined),
  container: containerSchema,
  self: selfPropsSchema,
  repeat: z.int().min(1),
  sourceId: nodeIdSchema.optional(),
  /** Дети блока; геттер нужен zod 4 для рекурсивной схемы. Плашки старых документов становятся блоками-связями. */
  get children(): z.ZodPreprocess<z.ZodArray<typeof blockNodeSchema>> {
    return z.preprocess(migrateLegacyLinkNodes, z.array(blockNodeSchema))
  },
})

/** Идентификатор узла или документа. */
export type NodeId = z.infer<typeof nodeIdSchema>

/** Семантический тег блока. */
export type LayoutTag = z.infer<typeof layoutTagSchema>

/** Свойства «как ребёнок». */
export type SelfProps = z.infer<typeof selfPropsSchema>

/** Положение блока в родителе (без поля — обычный поток). */
export type ChildPosition = NonNullable<SelfProps['position']>

/** Блок с детьми. */
export type BlockNode = z.infer<typeof blockNodeSchema>

/** Узел дерева; других видов узлов, кроме блока, нет (связь — блок с `sourceId`). */
export type LayoutNode = BlockNode
