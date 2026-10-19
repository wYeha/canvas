/** Общая фикстура тестов дерева: документ из трёх корней, заморозка входа и проверка схемой. */
import { expect } from 'vitest'
import { parseDocument, type BlockNode, type ContainerKind, type LayoutDocument, type LayoutNode } from '@shared'
import { createBlock, createDocument } from '@/scripts/pages/canvas/factories'

/** Создаёт блок с заданным id (он же подпись) и детьми. */
export function block(id: string, kind: ContainerKind, children: LayoutNode[] = []): BlockNode {
  return { ...createBlock(kind, id), id, children }
}

/** Рекурсивно замораживает объект: в strict mode любая мутация бросит ошибку. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

/** Проверяет, что документ проходит схему с проверками целостности. */
export function expectValid(doc: LayoutDocument): void {
  const result = parseDocument(doc)
  expect(result.ok, result.ok ? '' : result.error).toBe(true)
}

/**
 * Замороженный документ: A (flex, 1440) с [a1 (grid, [a1x, a1y]), a2, a3],
 * B (grid, 480) с [b1], C (flex, 960) с [c1].
 */
export function makeDoc(): LayoutDocument {
  const a = block('A', 'flex', [
    block('a1', 'grid', [block('a1x', 'flex'), block('a1y', 'flex')]),
    block('a2', 'flex'),
    block('a3', 'flex'),
  ])
  const b = block('B', 'grid', [block('b1', 'flex')])
  const c = block('C', 'flex', [block('c1', 'flex')])
  /** Размещение корня в точке (x, 0) с заданной шириной. */
  const placement = (x: number, width: number) => ({ x, y: 0, width, height: null, exportMaxWidth: false })
  return deepFreeze({
    ...createDocument('Тест'),
    roots: [
      { canvas: placement(0, 1440), node: a },
      { canvas: { ...placement(2000, 480), height: 300, exportMaxWidth: true }, node: b },
      { canvas: placement(3000, 960), node: c },
    ],
  })
}

/** Возвращает id детей блока (для коротких проверок порядка). */
export function childIds(node: LayoutNode | undefined): string[] {
  return node ? node.children.map((child) => child.id) : []
}
