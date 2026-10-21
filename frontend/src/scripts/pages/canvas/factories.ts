/** Фабрики модели: новые контейнеры, блоки, блоки-связи, корневые блоки и документы со значениями по умолчанию. */
import {
  SCHEMA_VERSION,
  type BlockNode,
  type ContainerKind,
  type FlexContainer,
  type GridContainer,
  type LayoutDocument,
  type NodeId,
  type RootEntry,
} from '@shared'
import { createId } from '@/scripts/globals/id'
import {
  AUTO_LABEL_PREFIX,
  CSS_DEFAULT_FLEX,
  DEFAULT_DOCUMENT_NAME,
  DEFAULT_FLEX,
  DEFAULT_GAP,
  DEFAULT_GRID,
  DEFAULT_REPEAT,
  DEFAULT_ROOT_FLEX_DIRECTION,
  DEFAULT_ROOT_WIDTH,
  DEFAULT_TAG,
} from './constants'

/** Точка на поле. */
export interface CanvasPoint {
  x: number
  y: number
}

/** Автоподпись и новое значение счётчика, которое нужно записать в документ. */
export interface AutoLabel {
  label: string
  labelCounter: number
}

/** Создаёт flex-контейнер со значениями по умолчанию. */
export function createFlexContainer(): FlexContainer {
  return { kind: 'flex', ...DEFAULT_FLEX }
}

/** Создаёт grid-контейнер со значениями по умолчанию. */
export function createGridContainer(): GridContainer {
  return { kind: 'grid', ...DEFAULT_GRID }
}

/** Создаёт пустой блок с flex- или grid-контейнером и средним зазором; «как ребёнок» `flex` сразу равен `0 1 auto`. */
export function createBlock(kind: ContainerKind, label: string): BlockNode {
  return {
    id: createId(),
    type: 'block',
    label,
    description: '',
    tag: DEFAULT_TAG,
    container: { ...(kind === 'flex' ? createFlexContainer() : createGridContainer()), gap: DEFAULT_GAP },
    self: { flex: CSS_DEFAULT_FLEX },
    repeat: DEFAULT_REPEAT,
    children: [],
  }
}

/**
 * Создаёт блок-связь на корень `sourceId`: на его месте при экспорте встанет источник. Контейнер, тег и подпись
 * у связи не используются (пустая подпись, flex по умолчанию); «как ребёнок» `flex` — `0 1 auto`, как у блока.
 */
export function createLinkBlock(sourceId: NodeId): BlockNode {
  return { ...createBlock('flex', ''), sourceId }
}

/** Создаёт корневой блок в точке поля; flex-корень по умолчанию раскладывает детей в колонку. */
export function createRootEntry(
  kind: ContainerKind,
  label: string,
  at: CanvasPoint,
  width: number = DEFAULT_ROOT_WIDTH,
): RootEntry {
  const node = createBlock(kind, label)
  if (node.container.kind === 'flex') {
    node.container = { ...node.container, direction: DEFAULT_ROOT_FLEX_DIRECTION }
  }
  return {
    canvas: { x: at.x, y: at.y, width, height: null, exportMaxWidth: false },
    node,
  }
}

/** Создаёт пустой документ. */
export function createDocument(name: string = DEFAULT_DOCUMENT_NAME): LayoutDocument {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    id: createId(),
    name,
    rules: '',
    labelCounter: 0,
    roots: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** Возвращает следующую автоподпись `Блок-N` и новый счётчик; документ не меняет. */
export function nextAutoLabel(doc: Pick<LayoutDocument, 'labelCounter'>): AutoLabel {
  const labelCounter = doc.labelCounter + 1
  return { label: `${AUTO_LABEL_PREFIX}${String(labelCounter)}`, labelCounter }
}
