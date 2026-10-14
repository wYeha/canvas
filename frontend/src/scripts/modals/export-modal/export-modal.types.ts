/** Типы окна экспорта: охват в интерфейсе и строка списка корневых блоков. */
import type { NodeId } from '@shared'

/** Охват в интерфейсе: выделенный блок, отмеченные корневые блоки, все корневые блоки. */
export type ExportScopeKind = 'selected' | 'checked' | 'all'

/** Строка списка корневых блоков: id, подпись, ширина превью (текст) и отметка. */
export interface ExportRootRow {
  id: NodeId
  label: string
  width: string
  checked: boolean
}
