/** Скачиваемый файл экспорта: полный HTML-документ, имя файла и статистика (строки, размер) для предпросмотра. */
import type { LayoutDocument, NodeId } from '@shared'
import { ROOT_UNTITLED_LABEL } from '@/scripts/pages/canvas/constants'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import { escapeHtmlAttr, toSingleLine } from './export-escape'
import {
  EXPORT_BYTES_IN_KB,
  EXPORT_FILE_EXTENSION,
  EXPORT_FILE_FALLBACK_NAME,
  EXPORT_FILE_FORBIDDEN_CHARS,
  EXPORT_FILE_MAX_LENGTH,
  EXPORT_FILE_RESERVED,
  EXPORT_FILE_RESERVED_SUFFIX,
  EXPORT_FILE_PART_SEPARATOR,
  EXPORT_FILE_REPLACEMENT,
  EXPORT_HTML_CHARSET,
  EXPORT_HTML_LANG,
  EXPORT_INDENT,
  EXPORT_NEWLINE,
  EXPORT_SIZE_UNITS,
} from './export-constants'
import type { ExportScope } from './export-types'

/** Статистика текста для строки меты предпросмотра. */
export interface ExportStats {
  lines: number
  size: string
}

/**
 * Оборачивает текст экспорта в полный HTML-документ: `meta charset` нужен, иначе кириллица в комментариях ломается
 * при открытии файла. Текст идёт в `<body>` с отступом на уровень; пустые строки остаются пустыми.
 */
export function wrapHtmlDocument(text: string, title: string): string {
  const body = text
    .replace(/\n$/, '')
    .split(EXPORT_NEWLINE)
    .map((line) => (line === '' ? '' : `${EXPORT_INDENT}${line}`))
  const lines = [
    '<!DOCTYPE html>',
    `<html lang="${EXPORT_HTML_LANG}">`,
    '<head>',
    `${EXPORT_INDENT}<meta charset="${EXPORT_HTML_CHARSET}">`,
    `${EXPORT_INDENT}<title>${escapeHtmlAttr(toSingleLine(title))}</title>`,
    '</head>',
    '<body>',
    ...body,
    '</body>',
    '</html>',
  ]
  return `${lines.join(EXPORT_NEWLINE)}${EXPORT_NEWLINE}`
}

/** Снимает пробелы и точки по краям (Windows их не терпит). */
function trimEdges(name: string): string {
  return name
    .trim()
    .replace(/^\.+|\.+$/g, '')
    .trim()
}

/**
 * Приводит имя к безопасному виду: недопустимые символы → дефис, длина не больше лимита (по code points),
 * пробелы и точки по краям сняты (и после обрезки тоже), зарезервированное имя Windows получает суффикс.
 */
export function sanitizeFileName(name: string): string {
  const cleaned = trimEdges(name.replace(EXPORT_FILE_FORBIDDEN_CHARS, EXPORT_FILE_REPLACEMENT))
  const cut = trimEdges(Array.from(cleaned).slice(0, EXPORT_FILE_MAX_LENGTH).join(''))
  return cut.replace(EXPORT_FILE_RESERVED, `$1${EXPORT_FILE_RESERVED_SUFFIX}`)
}

/** Подпись выделенного блока для имени файла; нет узла — пусто. */
function selectedLabel(doc: LayoutDocument, nodeId: NodeId): string {
  const node = findNode(doc, nodeId)
  if (!node) return ''
  const label = toSingleLine(node.label)
  return label === '' ? ROOT_UNTITLED_LABEL : label
}

/**
 * Имя файла: `{документ}.html` для «отмеченных» и «всех», `{документ} — {подпись блока}.html` для выделенного.
 * Пустое имя после очистки → `layout`.
 */
export function exportFileName(docName: string, scope: ExportScope, doc: LayoutDocument): string {
  const parts = [docName]
  if (scope.kind === 'selected') parts.push(selectedLabel(doc, scope.nodeId))
  const joined = sanitizeFileName(parts.filter((part) => part.trim() !== '').join(EXPORT_FILE_PART_SEPARATOR))
  return `${joined === '' ? EXPORT_FILE_FALLBACK_NAME : joined}${EXPORT_FILE_EXTENSION}`
}

/** Размер в байтах как текст: `840 Б`, `1,2 КБ`, `2,0 МБ`. */
export function formatSize(bytes: number): string {
  if (bytes < EXPORT_BYTES_IN_KB) return `${String(bytes)} ${EXPORT_SIZE_UNITS.bytes}`
  const kb = bytes / EXPORT_BYTES_IN_KB
  if (kb < EXPORT_BYTES_IN_KB) return `${kb.toFixed(1).replace('.', ',')} ${EXPORT_SIZE_UNITS.kb}`
  return `${(kb / EXPORT_BYTES_IN_KB).toFixed(1).replace('.', ',')} ${EXPORT_SIZE_UNITS.mb}`
}

/** Число строк и размер текста (в байтах UTF-8) для строки меты предпросмотра. */
export function formatExportStats(text: string): ExportStats {
  if (text === '') return { lines: 0, size: formatSize(0) }
  const lines = text.replace(/\n$/, '').split(EXPORT_NEWLINE).length
  return { lines, size: formatSize(new TextEncoder().encode(text).length) }
}
