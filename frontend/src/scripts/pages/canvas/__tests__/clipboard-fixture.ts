/** Фикстура тестов буфера (17.4): документ со связями — страница → карточка → значок, плюс второй документ. */
import type { LayoutDocument } from '@shared'
import { createDocument, createLinkBlock } from '@/scripts/pages/canvas/factories'
import { block } from './tree-fixture'

/** Размещение корня в точке (x, 0) с шириной `width`. */
function placement(x: number, width: number) {
  return { x, y: 0, width, height: null, exportMaxWidth: false }
}

/**
 * Документ: P (страница) с [p1 → связь на K, p2], K (карточка) с [k1 → связь на I], I (значок) с [i1].
 * Цепочка связей P → K → I: при копировании p1 нужны оба источника, сначала I.
 */
export function linkedDoc(): LayoutDocument {
  const icon = block('I', 'flex', [block('i1', 'flex')])
  const card = block('K', 'flex', [{ ...createLinkBlock('I'), id: 'k1' }])
  const page = block('P', 'flex', [{ ...createLinkBlock('K'), id: 'p1' }, block('p2', 'flex')])
  return {
    ...createDocument('Связи'),
    id: 'doc-linked',
    roots: [
      { canvas: placement(0, 1440), node: page },
      { canvas: placement(1600, 320), node: card },
      { canvas: placement(2000, 64), node: icon },
    ],
  }
}

/** Другой документ с одним пустым корнем X — сюда вставляют фрагмент из «другой вкладки». */
export function otherDoc(): LayoutDocument {
  return {
    ...createDocument('Другой'),
    id: 'doc-other',
    roots: [{ canvas: placement(0, 960), node: block('X', 'flex') }],
  }
}
