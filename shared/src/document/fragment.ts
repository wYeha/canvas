/**
 * Фрагмент для системного буфера обмена (17.4): поддерево блока и корни-источники его связей — чтобы вставить его
 * в другой документ или вкладку. JSON проверяется zod-схемой перед вставкой, как импорт документа.
 */
import { z } from 'zod'
import { FRAGMENT_FORMAT, FRAGMENT_VERSION } from './constants'
import { rootEntrySchema } from './document'
import { blockNodeSchema } from './node'

/** Фрагмент: метка формата и версии, блок с поддеревом, ширина превью (если копировали корень) и источники связей. */
export const layoutFragmentSchema = z.object({
  format: z.literal(FRAGMENT_FORMAT),
  version: z.literal(FRAGMENT_VERSION),
  node: blockNodeSchema,
  rootWidth: z.number().positive().nullable(),
  sources: z.array(rootEntrySchema),
})

/** Сообщение о битом фрагменте в буфере. */
export const FRAGMENT_INVALID_MESSAGE = 'Фрагмент в буфере обмена повреждён или от другой версии редактора'

/** Фрагмент поддерева для буфера обмена. */
export type LayoutFragment = z.infer<typeof layoutFragmentSchema>

/**
 * Результат разбора текста из буфера: фрагмент; «не фрагмент» (обычный текст — его не трогаем); или битый фрагмент
 * (метка формата наша, а данные не проходят схему) с сообщением для пользователя.
 */
export type ParseFragmentResult =
  { kind: 'fragment'; fragment: LayoutFragment } | { kind: 'not-fragment' } | { kind: 'invalid'; error: string }

/** Текст как JSON или `undefined`, если это не JSON. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Есть ли у данных наша метка формата: только тогда ошибка схемы — «битый фрагмент», а не чужой текст. */
function hasFormatMark(data: unknown): boolean {
  return typeof data === 'object' && data !== null && 'format' in data && data.format === FRAGMENT_FORMAT
}

/** Разбирает текст из буфера обмена в фрагмент. */
export function parseFragment(text: string): ParseFragmentResult {
  const data = parseJson(text)
  if (!hasFormatMark(data)) return { kind: 'not-fragment' }
  const result = layoutFragmentSchema.safeParse(data)
  if (result.success) return { kind: 'fragment', fragment: result.data }
  return { kind: 'invalid', error: FRAGMENT_INVALID_MESSAGE }
}
