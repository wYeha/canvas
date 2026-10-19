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
 * - `duplicate-id` — в добавляемом поддереве есть id, который уже есть в документе;
 * - `target-is-link` — внутрь связи ничего не кладётся (на её месте стоит источник);
 * - `link-to-canvas` — связь не может стать корнем: она — место внутри блока;
 * - `source-into-block` — корень-источник связей нельзя вложить в блок: связи на него повисли бы;
 * - `source-not-found` — связь в добавляемом поддереве ведёт на корень, которого нет в документе;
 * - `link-cycle` — связь оказалась бы внутри своего источника (прямо или через цепочку связей).
 */
export type TreeError =
  | 'node-not-found'
  | 'target-not-found'
  | 'into-self-or-descendant'
  | 'duplicate-id'
  | 'target-is-link'
  | 'link-to-canvas'
  | 'source-into-block'
  | 'source-not-found'
  | 'link-cycle'

/**
 * Правка полей узла: вложенные объекты (`container`, `self`) заменяются целиком.
 * Ключ со значением `undefined` означает «не менять»; необязательные поля `self` стираются заменой `self` целиком.
 * Источник связи (`sourceId`) так не меняется: перепривязка — отдельная операция с проверкой циклов.
 */
export type NodePatch = Partial<Omit<BlockNode, 'id' | 'type' | 'children' | 'sourceId'>>

/** Результат дублирования: новый документ и id копии; `copyId === null` ⇔ документ не изменился. */
export interface DuplicateResult {
  document: LayoutDocument
  copyId: NodeId | null
}
