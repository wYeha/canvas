/** Чистая логика панели свойств: состав секций по выделению, заголовок и состояние сворачивания. Без Vue. */
import { isLinkBlock, type ContainerKind, type LayoutNode } from '@shared'
import {
  LINK_TYPE_LABEL,
  PROPS_META_CHILD,
  PROPS_META_ROOT,
  PROPS_META_SEPARATOR,
  PROPS_SECTION_TITLES,
} from './constants'
import { directionIcon, linkSourceName, type SourceLabels } from './node-view'
import { nodeCaption } from './selection'

/** Id секции панели свойств. */
export type PropsSectionId = keyof typeof PROPS_SECTION_TITLES

/** Состояние сворачивания: id секции → раскрыта ли. Нет записи — раскрыта. */
export type PropsSectionsState = Readonly<Record<string, boolean>>

/** Заголовок панели: значок типа, подпись и мета справа. */
export interface PropsHeader {
  icon: string
  title: string
  meta: string
}

/**
 * Состав секций по узлу и виду контейнера родителя (`null` — корень): «Ширина превью» только у корня,
 * «Как ребёнок» не у корня; у связи — только «Связь» и «Как ребёнок» (своих блока и контейнера у неё нет).
 */
export function propsSectionIds(node: LayoutNode, parentKind: ContainerKind | null): PropsSectionId[] {
  if (isLinkBlock(node)) return ['link', 'child']
  return parentKind === null ? ['preview', 'block', 'container'] : ['block', 'container', 'child']
}

/** Заголовок панели: `flex · ребёнок grid`, `корневой · flex` или у связи `связь · ребёнок flex` с именем источника. */
export function propsHeader(node: LayoutNode, parentKind: ContainerKind | null, labels: SourceLabels): PropsHeader {
  const kind = isLinkBlock(node) ? LINK_TYPE_LABEL : node.container.kind
  const meta = parentKind === null ? [PROPS_META_ROOT, kind] : [kind, `${PROPS_META_CHILD} ${parentKind}`]
  const title = isLinkBlock(node) ? linkSourceName(node.sourceId, labels) : nodeCaption(node, labels)
  return { icon: directionIcon(node), title, meta: meta.join(PROPS_META_SEPARATOR) }
}

/** Разбирает сохранённую строку состояния; мусор и не-булевы значения отбрасываются. */
export function parseSectionsState(raw: string | null): PropsSectionsState {
  if (raw === null) return {}
  try {
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {}
    const entries = Object.entries(data).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
    return Object.fromEntries(entries)
  } catch {
    return {}
  }
}

/** Раскрыта ли секция: по умолчанию да. */
export function isSectionOpen(state: PropsSectionsState, id: PropsSectionId): boolean {
  return state[id] ?? true
}

/** Возвращает новое состояние с изменённой секцией. */
export function withSectionOpen(state: PropsSectionsState, id: PropsSectionId, open: boolean): PropsSectionsState {
  return { ...state, [id]: open }
}
