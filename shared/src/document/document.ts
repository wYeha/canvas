/** Zod-схемы и типы документа: корневые блоки на поле и сам документ с проверками целостности. */
import { z } from 'zod'
import { SCHEMA_VERSION } from './constants'
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
export const rootEntrySchema = z.object({
  canvas: canvasPlacementSchema,
  node: blockNodeSchema,
})

/** Структура документа без проверок целостности (уникальность id, источники и циклы связей). */
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
    if (current.node.type === 'block') {
      current.node.children.forEach((child, index) => {
        stack.push({ node: child, path: [...current.path, 'children', index] })
      })
    }
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

/** Отмечает связи, у которых источник не корневой блок документа. */
function checkLinkSources(doc: DocumentShape, nodes: readonly NodeWithPath[], ctx: RefineContext): void {
  const rootIds = new Set(doc.roots.map((root) => root.node.id))
  for (const { node, path } of nodes) {
    if (node.type === 'link' && !rootIds.has(node.sourceId)) {
      ctx.addIssue({
        code: 'custom',
        message: `Связь ссылается на «${node.sourceId}», а это не корневой блок документа`,
        path: [...path, 'sourceId'],
      })
    }
  }
}

/** Отмечает циклы: плашка в корне, который её источник уже включает (сам или транзитивно через свои связи). */
function checkLinkCycles(doc: DocumentShape, nodes: readonly NodeWithPath[], ctx: RefineContext): void {
  const cyclic = cyclicLinkIds(doc)
  for (const { node, path } of nodes) {
    if (node.type === 'link' && cyclic.has(node.id)) {
      ctx.addIssue({
        code: 'custom',
        message: `Связь на «${node.sourceId}» замыкает цикл: источник уже включает это место`,
        path: [...path, 'sourceId'],
      })
    }
  }
}

/**
 * Документ с проверками целостности: id узлов уникальны во всём документе, каждая связь указывает
 * на существующий корневой блок и не замыкает цикл: ни прямо (внутри собственного источника), ни через цепочку связей.
 */
export const layoutDocumentSchema = layoutDocumentShapeSchema.superRefine((doc, ctx) => {
  const nodes = collectNodes(doc.roots)
  checkUniqueIds(nodes, ctx)
  checkLinkSources(doc, nodes, ctx)
  checkLinkCycles(doc, nodes, ctx)
})

/** Положение корневого блока на поле. */
export type CanvasPlacement = z.infer<typeof canvasPlacementSchema>

/** Корневой блок на поле. */
export type RootEntry = z.infer<typeof rootEntrySchema>

/** Документ: сохраняется и открывается целиком. */
export type LayoutDocument = z.infer<typeof layoutDocumentSchema>
