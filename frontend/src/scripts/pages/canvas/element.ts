/**
 * Чистая логика смыслового элемента блока (15.4): нормализация ввода и место в экспорте — тег листа или пометка в
 * начале комментария. Раскладочный тег (`div`, `header`…) не меняется. Без Vue и Pinia.
 */
import { ELEMENT_NAME_MAX_LENGTH, ELEMENT_NAME_PATTERN, isLinkBlock, type BlockNode } from '@shared'
import { LEAF_ELEMENT_TAGS } from './constants'

/** Угловые скобки, которые пользователь мог ввести вместе с именем (`<h1>`). */
const ANGLE_BRACKETS = /[<>]/g

/**
 * Нормализует ввод: без пробелов и угловых скобок, строчными. Пустая строка — «не задан» (`''`),
 * недопустимое имя — `null` (ошибка поля).
 */
export function normalizeElement(value: string): string | null {
  const name = value.replace(ANGLE_BRACKETS, '').trim().toLowerCase()
  if (name === '') return ''
  return name.length <= ELEMENT_NAME_MAX_LENGTH && ELEMENT_NAME_PATTERN.test(name) ? name : null
}

/** Смысловой элемент блока или `null`, если не задан. */
function elementOf(block: BlockNode): string | null {
  return block.element === undefined || block.element === '' ? null : block.element
}

/**
 * Тег, которым экспорт выводит блок вместо раскладочного: смысловой элемент листа, если в него помещается
 * комментарий. У контейнера, связи и пустых элементов (`img`) — `null`.
 */
export function elementTag(block: BlockNode): string | null {
  const element = elementOf(block)
  if (element === null || block.children.length > 0 || isLinkBlock(block)) return null
  return LEAF_ELEMENT_TAGS.has(element) ? element : null
}

/** Пометка элемента в начале комментария (`img`), если он не стал тегом; иначе `null`. */
export function elementCommentMark(block: BlockNode): string | null {
  const element = elementOf(block)
  return element === null || elementTag(block) !== null ? null : element
}
