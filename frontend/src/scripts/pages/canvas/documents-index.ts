/**
 * Чистая логика списка документов: запись индекса из документа, сериализация и разбор индекса,
 * сортировка по давности, подписи меты («изменён вчера · 5 корневых»). Время передаётся аргументом.
 */
import type { LayoutDocument } from '@shared'
import {
  META_SEPARATOR,
  MONTH_SHORT_NAMES,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  ROOTS_WORD_FORMS,
  UPDATED_HOURS_SUFFIX,
  UPDATED_JUST_NOW,
  UPDATED_MINUTES_SUFFIX,
  UPDATED_PREFIX,
  UPDATED_YESTERDAY,
} from './documents-constants'
import type { DocumentMeta } from './documents.types'

/** Миллисекунд в сутках (для разницы календарных дней). */
const MS_PER_DAY = 86_400_000

/** Результат разбора индекса: годные записи, число отброшенных и признак того, что индекс целиком нечитаем. */
export interface ParsedIndex {
  metas: DocumentMeta[]
  skipped: number
  broken: boolean
}

/** Строит запись индекса из документа. */
export function toMeta(doc: LayoutDocument): DocumentMeta {
  return { id: doc.id, name: doc.name, updatedAt: doc.updatedAt, rootCount: doc.roots.length }
}

/** Время записи в мс; нечитаемая дата считается самой старой. */
function timeOf(meta: DocumentMeta): number {
  const time = Date.parse(meta.updatedAt)
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

/** Сортирует записи по давности изменения, свежие первыми; новый массив, равные по времени сохраняют порядок. */
export function sortMetas(metas: readonly DocumentMeta[]): DocumentMeta[] {
  return [...metas].sort((a, b) => {
    const diff = timeOf(b) - timeOf(a)
    return Number.isNaN(diff) ? 0 : diff
  })
}

/** Заменяет запись с тем же id или добавляет новую; возвращает новый отсортированный массив. */
export function upsertMeta(metas: readonly DocumentMeta[], meta: DocumentMeta): DocumentMeta[] {
  return sortMetas([...metas.filter((item) => item.id !== meta.id), meta])
}

/** Убирает запись по id; возвращает новый массив. */
export function removeMeta(metas: readonly DocumentMeta[], id: string): DocumentMeta[] {
  return metas.filter((item) => item.id !== id)
}

/** Сериализует индекс в строку для localStorage. */
export function serializeIndex(metas: readonly DocumentMeta[]): string {
  return JSON.stringify(metas)
}

/** Проверяет, что значение — годная запись индекса (внешние данные: localStorage мог быть изменён вручную). */
function isMeta(value: unknown): value is DocumentMeta {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    item.id !== '' &&
    typeof item.name === 'string' &&
    typeof item.updatedAt === 'string' &&
    typeof item.rootCount === 'number' &&
    Number.isInteger(item.rootCount) &&
    item.rootCount >= 0
  )
}

/** Разбирает строку индекса: плохие записи отбрасываются (с подсчётом), нечитаемый индекс целиком — пустой и `broken`. */
export function parseIndex(raw: string | null): ParsedIndex {
  if (raw === null) return { metas: [], skipped: 0, broken: false }
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { metas: [], skipped: 0, broken: true }
  }
  if (!Array.isArray(data)) return { metas: [], skipped: 0, broken: true }
  const seen = new Set<string>()
  const metas: DocumentMeta[] = []
  for (const item of data as unknown[]) {
    if (!isMeta(item) || seen.has(item.id)) continue
    seen.add(item.id)
    metas.push({ id: item.id, name: item.name, updatedAt: item.updatedAt, rootCount: item.rootCount })
  }
  return { metas: sortMetas(metas), skipped: data.length - metas.length, broken: false }
}

/** Выбирает, какой документ открыть: предпочитаемый, если он есть в индексе, иначе самый свежий; `null` — индекс пуст. */
export function pickDocumentId(metas: readonly DocumentMeta[], preferredId: string | null): string | null {
  if (preferredId !== null && metas.some((meta) => meta.id === preferredId)) return preferredId
  return sortMetas(metas)[0]?.id ?? null
}

/** Склонение слова «корневой» для числа `count`: 1 корневой, 2–4 корневых, 5–20 корневых, 21 корневой. */
export function rootsWord(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (last === 1 && lastTwo !== 11) return ROOTS_WORD_FORMS.one
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return ROOTS_WORD_FORMS.few
  return ROOTS_WORD_FORMS.many
}

/** Начало календарных суток (локальных) в мс. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Дата вида «8 окт»; для другого года добавляется год. */
function formatDate(date: Date, now: Date): string {
  const base = `${String(date.getDate())} ${MONTH_SHORT_NAMES[date.getMonth()] ?? ''}`
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${String(date.getFullYear())}`
}

/**
 * Давность изменения словами: «только что», «N мин назад», «N ч назад» (в пределах суток),
 * «вчера», затем дата «8 окт». Пустая строка, если дата нечитаема.
 */
export function formatUpdatedAt(updatedAt: string, now: Date): string {
  const time = Date.parse(updatedAt)
  if (Number.isNaN(time)) return ''
  const diff = now.getTime() - time
  if (diff < MS_PER_MINUTE) return UPDATED_JUST_NOW
  if (diff < MS_PER_HOUR) return `${String(Math.floor(diff / MS_PER_MINUTE))} ${UPDATED_MINUTES_SUFFIX}`
  const date = new Date(time)
  const days = Math.round((startOfDay(now) - startOfDay(date)) / MS_PER_DAY)
  if (days <= 0) return `${String(Math.floor(diff / MS_PER_HOUR))} ${UPDATED_HOURS_SUFFIX}`
  if (days === 1) return UPDATED_YESTERDAY
  return formatDate(date, now)
}

/** Мета строки документа: «изменён вчера · 5 корневых». */
export function formatDocumentMeta(meta: DocumentMeta, now: Date): string {
  const roots = `${String(meta.rootCount)} ${rootsWord(meta.rootCount)}`
  const updated = formatUpdatedAt(meta.updatedAt, now)
  return updated === '' ? roots : [`${UPDATED_PREFIX} ${updated}`, roots].join(META_SEPARATOR)
}
