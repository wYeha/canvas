/** Типы операций над деревом: положение узла, цель перемещения, причины отказа, патч узла и результат дублирования. */
import type { BlockNode, LayoutDocument, NodeId } from '@shared'
import type { CanvasPoint } from './factories'

/** Положение узла в документе: индекс корня и индексы детей от корня до узла; `[]` — сам корень. */
export interface NodeLocation {
  rootIndex: number
  indices: number[]
}

/**
 * Куда переместить узел: ребёнком блока на позицию `index` (в текущем списке детей, до изъятия узла)
 * или на канвас корнем в точку `at`. `width` — ширина превью нового корня, `rootIndex` — место в `roots`.
 */
export type MoveTarget =
  | { type: 'child'; parentId: NodeId; index: number }
  | { type: 'canvas'; at: CanvasPoint; width?: number; rootIndex?: number }

/**
 * Причина, по которой операция над деревом недопустима.
 * - `node-not-found` — перемещаемого узла нет;
 * - `target-not-found` — нет блока-цели;
 * - `into-self-or-descendant` — узел нельзя вложить в себя или своего потомка;
 * - `duplicate-id` — в добавляемом поддереве есть id, который уже есть в документе.
 */
export type TreeError = 'node-not-found' | 'target-not-found' | 'into-self-or-descendant' | 'duplicate-id'

/**
 * Правка полей узла: вложенные объекты (`container`, `self`) заменяются целиком.
 * Ключ со значением `undefined` означает «не менять»; необязательные поля `self` стираются заменой `self` целиком.
 */
export type NodePatch = Partial<Omit<BlockNode, 'id' | 'type' | 'children'>>

/** Результат дублирования: новый документ и id копии; `copyId === null` ⇔ документ не изменился. */
export interface DuplicateResult {
  document: LayoutDocument
  copyId: NodeId | null
}
