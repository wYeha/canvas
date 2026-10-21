/** Zod-схемы и типы документа: корневые блоки на поле и сам документ с проверками целостности (id, связи, циклы). */
import { z } from 'zod'
import { ROOT_REPEAT, SCHEMA_VERSION } from './constants'
import { cyclicLinkIds } from './link-logic'
import { blockNodeSchema, nodeIdSchema, type LayoutNode } from './node'

/** Положение и размер корневого блока на поле. `width` — ширина превью, в CSS как `width` не экспортируется. */
export const canvasPlacementSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive().nullable(),
  exportMaxWidth: z.boolean(),
})

/** Корневой блок: лежит прямо на поле, без родителя. */
export const rootEntrySchema = z
  .object({
    canvas: canvasPlacementSchema,
    node: blockNodeSchema,
  })
  // У корня повтора нет (поле «Повтор» только у вложенных блоков): значение из импорта сводим к 1
  .transform((entry) => ({ ...entry, node: { ...entry.node, repeat: ROOT_REPEAT } }))

/** Структура документа без проверок целостности (уникальность id). */
export const layoutDocumentShapeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: nodeIdSchema,
  name: z.string(),
  /** Правила документа для ИИ (общие правила вёрстки), подставляются в промпт экспорта; в старых документах — пусто. */
  rules: z.string().default(''),
  labelCounter: z.int().min(0),
  roots: z.array(rootEntrySchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/** Узел вместе с путём к нему от корня документа (для понятных сообщений об ошибках). */
interface NodeWithPath {
  node: LayoutNode
  path: PropertyKey[]
}

/** Обходит все узлы всех корневых блоков в глубину и возвращает их вместе с путями. */
function collectNodes(roots: readonly { node: LayoutNode }[]): NodeWithPath[] {
  const result: NodeWithPath[] = []
  const stack: NodeWithPath[] = roots.map((root, index) => ({ node: root.node, path: ['roots', index, 'node'] }))
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) break
    result.push(current)
    current.node.children.forEach((child, index) => {
      stack.push({ node: child, path: [...current.path, 'children', index] })
    })
  }
  return result
}

/** Документ до проверок целостности. */
type DocumentShape = z.infer<typeof layoutDocumentShapeSchema>

/** Контекст проверки zod: сюда добавляются найденные нарушения целостности. */
type RefineContext = z.RefinementCtx<DocumentShape>

/** Отмечает повторяющиеся id узлов. */
function checkUniqueIds(nodes: readonly NodeWithPath[], ctx: RefineContext): void {
  const seen = new Set<string>()
  for (const { node, path } of nodes) {
    if (seen.has(node.id)) {
      ctx.addIssue({ code: 'custom', message: `Повторяющийся id узла «${node.id}»`, path: [...path, 'id'] })
    }
    seen.add(node.id)
  }
}

/** Отмечает связи с детьми и связи, ссылающиеся не на корневой блок документа. */
function checkLinkShape(doc: DocumentShape, nodes: readonly NodeWithPath[], ctx: RefineContext): void {
  const rootIds = new Set(doc.roots.map((root) => root.node.id))
  for (const { node, path } of nodes) {
    if (node.sourceId === undefined) continue
    if (node.children.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `У связи «${node.id}» не может быть вложенных блоков`,
        path: [...path, 'children'],
      })
    }
    if (!rootIds.has(node.sourceId)) {
      ctx.addIssue({
        code: 'custom',
        message: `Связь ссылается на корневой блок «${node.sourceId}», которого нет на поле`,
        path: [...path, 'sourceId'],
      })
    }
  }
}

/** Отмечает корни-связи: связь — место внутри блока, на поле она стоять не может. */
function checkRootsAreNotLinks(doc: DocumentShape, ctx: RefineContext): void {
  doc.roots.forEach((root, index) => {
    if (root.node.sourceId === undefined) return
    ctx.addIssue({
      code: 'custom',
      message: 'Корневой блок не может быть связью',
      path: ['roots', index, 'node', 'sourceId'],
    })
  })
}

/** Отмечает связи, замыкающие цикл: источник уже включает место, куда подключён (прямо или через цепочку). */
function checkLinkCycles(doc: DocumentShape, nodes: readonly NodeWithPath[], ctx: RefineContext): void {
  const cyclic = cyclicLinkIds(doc)
  if (cyclic.size === 0) return
  for (const { node, path } of nodes) {
    if (!cyclic.has(node.id)) continue
    ctx.addIssue({
      code: 'custom',
      message: `Связь «${node.id}» замыкает цикл: источник уже включает это место`,
      path: [...path, 'sourceId'],
    })
  }
}

/**
 * Документ с проверками целостности: id узлов уникальны во всём документе; связи без детей, ведут на существующий
 * корень и не замыкают цикл; корни — не связи.
 */
export const layoutDocumentSchema = layoutDocumentShapeSchema.superRefine((doc, ctx) => {
  const nodes = collectNodes(doc.roots)
  checkUniqueIds(nodes, ctx)
  checkRootsAreNotLinks(doc, ctx)
  checkLinkShape(doc, nodes, ctx)
  checkLinkCycles(doc, nodes, ctx)
})

/** Положение корневого блока на поле. */
export type CanvasPlacement = z.infer<typeof canvasPlacementSchema>

/** Корневой блок на поле. */
export type RootEntry = z.infer<typeof rootEntrySchema>

/** Документ: сохраняется и открывается целиком. */
export type LayoutDocument = z.infer<typeof layoutDocumentSchema>
