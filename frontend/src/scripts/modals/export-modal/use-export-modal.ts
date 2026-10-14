/** Логика окна экспорта: код по охвату, промпт, подсветка двух частей, мета предпросмотра, копирование и скачивание. */
import { computed, toRef, type ComputedRef, type Ref } from 'vue'
import { exportFileName, formatExportStats } from '@/scripts/pages/canvas/export/export-file'
import { highlightCode } from '@/scripts/pages/canvas/export/export-highlight'
import { withPrompt } from '@/scripts/pages/canvas/export/export-prompt'
import { exportScopeHtml } from '@/scripts/pages/canvas/export/export-scope'
import type { HighlightKind, HighlightLine } from '@/scripts/pages/canvas/export/export-types'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import {
  EXPORT_EMPTY_DOCUMENT,
  EXPORT_EMPTY_NOTHING_CHECKED,
  EXPORT_LINES_WORDS,
  EXPORT_META_SEPARATOR,
} from './export-modal.constants'
import { useExportActions, type ExportActionsState } from './use-export-actions'
import { useExportPrompt, type ExportPromptState } from './use-export-prompt'
import { useExportScope, type ExportScopeState } from './use-export-scope'

/** Результат `useExportModal`: охват, промпт, предпросмотр и действия. */
export interface ExportModalState extends ExportScopeState, ExportActionsState, ExportPromptState {
  /** Строки предпросмотра: сначала промпт, потом код, сквозная нумерация. */
  lines: ComputedRef<HighlightLine[]>
  /** Строка меты: имя файла · число строк · размер. */
  meta: ComputedRef<string>
  /** Текст пустого состояния предпросмотра; пусто, если код есть. */
  emptyText: ComputedRef<string>
  /** Нечего копировать и скачивать. */
  isEmpty: ComputedRef<boolean>
  /** Классы токена подсветки. */
  tokenClasses: (kind: HighlightKind) => string[]
}

/** Склоняет «строка» по числу: 1 строка, 2 строки, 5 строк. */
export function linesText(count: number): string {
  const word = EXPORT_LINES_WORDS[new Intl.PluralRules('ru').select(count) as keyof typeof EXPORT_LINES_WORDS]
  return `${String(count)} ${word}`
}

/** Классы токена: базовый и модификатор вида. */
export function tokenClasses(kind: HighlightKind): string[] {
  return ['export-modal__token', `export-modal__token--${kind}`]
}

/** Собирает состояние окна экспорта поверх v-model:open. */
export function useExportModal(open: Ref<boolean>): ExportModalState {
  const layoutStore = useLayoutStore()
  const scopeState = useExportScope(open)
  const promptState = useExportPrompt()
  const { scope, measuredWidths, scopeKind } = scopeState

  // Пока окно закрыто, ничего не считаем: код большого документа не нужен фону
  const code = computed(() => {
    if (!open.value || scope.value === null) return ''
    return exportScopeHtml(layoutStore.document, scope.value, { measuredWidths: measuredWidths.value })
  })
  const text = computed(() => withPrompt(promptState.prompt.value, code.value))
  const fileName = computed(() =>
    exportFileName(layoutStore.document.name, scope.value ?? { kind: 'all' }, layoutStore.document),
  )

  const lines = computed<HighlightLine[]>(() => {
    const promptPart = highlightCode(text.value.slice(0, text.value.length - code.value.length), 'prompt')
    const codeLines = highlightCode(code.value, 'code').map((line) => ({
      ...line,
      number: line.number + promptPart.length,
    }))
    return [...promptPart, ...codeLines]
  })

  const meta = computed(() => {
    const stats = formatExportStats(text.value)
    return [fileName.value, linesText(stats.lines), stats.size].join(EXPORT_META_SEPARATOR)
  })

  const isEmpty = computed(() => code.value === '')
  const emptyText = computed(() => {
    if (!isEmpty.value) return ''
    return scopeKind.value === 'checked' ? EXPORT_EMPTY_NOTHING_CHECKED : EXPORT_EMPTY_DOCUMENT
  })

  const actions = useExportActions(
    open,
    text,
    fileName,
    toRef(() => layoutStore.document.name),
  )

  return { ...scopeState, ...actions, ...promptState, lines, meta, emptyText, isEmpty, tokenClasses }
}
