/** Типы экспорта в HTML: части комментария узла и параметры экспорта (охват и план корней появятся в 4.3). */
import type { NodeId } from '@shared'

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
