/** Zod-схемы и типы документа: корневые блоки на поле и сам документ с проверками целостности. */
import { z } from 'zod'
import { SCHEMA_VERSION } from './constants'
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
export const rootEntrySchema = z.object({
  canvas: canvasPlacementSchema,
  node: blockNodeSchema,
})

/** Структура документа без проверок целостности (уникальность id). */
export const layoutDocumentShapeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: nodeIdSchema,
  name: z.string(),
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

/** Документ с проверками целостности: id узлов уникальны во всём документе. */
export const layoutDocumentSchema = layoutDocumentShapeSchema.superRefine((doc, ctx) => {
  checkUniqueIds(collectNodes(doc.roots), ctx)
})

/** Положение корневого блока на поле. */
export type CanvasPlacement = z.infer<typeof canvasPlacementSchema>

/** Корневой блок на поле. */
export type RootEntry = z.infer<typeof rootEntrySchema>

/** Документ: сохраняется и открывается целиком. */
export type LayoutDocument = z.infer<typeof layoutDocumentSchema>
