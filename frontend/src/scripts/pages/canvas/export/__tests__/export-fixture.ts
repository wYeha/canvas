/** Общие данные тестов экспорта: сборка блоков, корней и документа, небольшое дерево с листьями разных видов. */
import type { BlockNode, ContainerKind, LayoutDocument, LayoutNode, RootEntry } from '@shared'
import { createBlock, createDocument, createGridContainer } from '@/scripts/pages/canvas/factories'

/** Блок с подписью, полями поверх умолчаний и детьми. */
export function block(
  kind: ContainerKind,
  label: string,
  extra: Partial<BlockNode> = {},
  children: LayoutNode[] = [],
): BlockNode {
  const base = createBlock(kind, label)
  // Без зазора (у нового блока M): тесты экспорта проверяют остальное, зазор — отдельно в export-gap.test.ts
  const container: Record<string, unknown> = { ...base.container }
  Reflect.deleteProperty(container, 'gap')
  return { ...base, container: container as BlockNode['container'], ...extra, children }
}

/** Корень на поле с заданными шириной, высотой и флагом max-width. */
export function root(node: BlockNode, width: number, height: number | null, exportMaxWidth: boolean): RootEntry {
  return { canvas: { x: 0, y: 0, width, height, exportMaxWidth }, node }
}

/** Документ из готовых корней. */
export function docOf(...roots: RootEntry[]): LayoutDocument {
  return { ...createDocument('Тест'), roots }
}

/** Grid-лист с изменёнными rows и rowSpan: контейнерная часть не по умолчанию и выводится. */
function gridLeaf(): BlockNode {
  return block('grid', 'gallery', {
    container: { ...createGridContainer(), rows: '40px 1fr' },
    self: { rowSpan: 2 },
  })
}

/** Небольшое дерево: flex-корень, grid-ребёнок с многострочным описанием, листья разных видов. */
export function smallTree(): BlockNode {
  const cards = block(
    'grid',
    'cards',
    {
      description: 'Карточки товаров\nпо три в ряд',
      container: { ...createGridContainer(), columns: 'repeat(3, 1fr)' },
      self: { flex: '1' },
    },
    [
      block('flex', 'card', { repeat: 3, description: 'Карточка товара' }),
      block('flex', ''),
      block('flex', 'promo', { self: { colSpan: 2 }, description: 'Рекламный блок\n\nс картинкой\n' }),
      gridLeaf(),
    ],
  )
  return block(
    'flex',
    'Каталог',
    {
      tag: 'main',
      description: 'Страница каталога\nдля десктопа',
      container: { kind: 'flex', direction: 'column', wrap: false, justify: 'flex-start', align: 'stretch' },
    },
    [cards, block('flex', 'footer', { tag: 'footer', self: { height: '80px' } })],
  )
}
