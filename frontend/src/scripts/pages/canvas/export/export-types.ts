/** Типы экспорта в HTML: части комментария узла, параметры экспорта, охват и план корней. */
import type { NodeId, RootEntry } from '@shared'

/** Части комментария: однострочная голова и строки многострочного описания (без экранирования). */
export interface CommentParts {
  head: string
  body: string[]
}

/** Параметры экспорта. */
export interface ExportOptions {
  /** Замеренные в превью ширины узлов, CSS px (округлены); нет замера — «Место» без px. */
  measuredWidths?: ReadonlyMap<NodeId, number>
}

/** Охват экспорта: выделенный узел, отмеченные корни (`roots`) или все корни документа. */
export type ExportScope =
  { kind: 'selected'; nodeId: NodeId } | { kind: 'roots'; rootIds: readonly NodeId[] } | { kind: 'all' }

/** План вывода корня; роль `component` (подключён связью) появится в 8.7. */
export interface ExportRootPlan {
  entry: RootEntry
  role: 'standalone'
}

/** Номер корня среди выводимых (с 1) и их общее число: для заголовка `1 из 3. `. */
export interface RootOrder {
  index: number
  total: number
}
