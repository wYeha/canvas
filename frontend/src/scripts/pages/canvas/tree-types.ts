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
 * - `parent-is-link` — у плашки связи не бывает детей;
 * - `into-self-or-descendant` — узел нельзя вложить в себя или своего потомка;
 * - `link-to-canvas` — плашка связи не может стать корнем;
 * - `source-into-block` — корень, на который ссылаются связи, нельзя вложить в блок;
 * - `duplicate-id` — в добавляемом поддереве есть id, который уже есть в документе;
 * - `dangling-link` — в добавляемом поддереве есть связь на блок, который не корень документа;
 * - `link-cycle` — плашка связи окажется внутри собственного источника (в нём самом или в его потомке).
 */
export type TreeError =
  | 'node-not-found'
  | 'target-not-found'
  | 'parent-is-link'
  | 'into-self-or-descendant'
  | 'link-to-canvas'
  | 'source-into-block'
  | 'duplicate-id'
  | 'dangling-link'
  | 'link-cycle'

/**
 * Правка полей узла: вложенные объекты (`container`, `self`, `padding`) заменяются целиком.
 * Ключ со значением `undefined` означает «не менять»; необязательные поля `self` стираются заменой `self` целиком.
 */
export type NodePatch = Partial<Omit<BlockNode, 'id' | 'type' | 'children'>>

/** Результат дублирования: новый документ и id копии; `copyId === null` ⇔ документ не изменился. */
export interface DuplicateResult {
  document: LayoutDocument
  copyId: NodeId | null
}
