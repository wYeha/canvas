/** Константы экспорта в HTML: форматирование, тексты комментариев и предупреждений, допустимые имена свойств и теги. */

/** Отступ одного уровня вложенности в выводе. */
export const EXPORT_INDENT = '  '

/** Перевод строки в выводе: всегда `\n`, независимо от платформы. */
export const EXPORT_NEWLINE = '\n'

/** Знак повтора в комментарии: `nav-item ×3`. */
export const EXPORT_REPEAT_MARK = '×'

/** Разделитель подписи и однострочного описания в комментарии. */
export const EXPORT_DESCRIPTION_SEPARATOR = ' — '

/** Разделитель частей заголовка корня. */
export const EXPORT_LIST_SEPARATOR = ', '

/** Открывающая кавычка подписи в комментариях. */
export const EXPORT_QUOTE_OPEN = '«'

/** Закрывающая кавычка подписи в комментариях. */
export const EXPORT_QUOTE_CLOSE = '»'

/** Начало HTML-комментария. */
export const EXPORT_COMMENT_OPEN = '<!--'

/** Конец HTML-комментария. */
export const EXPORT_COMMENT_CLOSE = '-->'

/** Начало заголовка корня: `Корневой блок «Дашборд»`. */
export const EXPORT_ROOT_TITLE = 'Корневой блок'

/** Подпись ширины превью в заголовке корня: `ширина превью 1440px`. */
export const EXPORT_ROOT_PREVIEW_WIDTH = 'ширина превью'

/** Подпись фиксированной высоты превью в заголовке корня: `высота превью 900px`. */
export const EXPORT_ROOT_PREVIEW_HEIGHT = 'высота превью'

/** Подпись ограничения ширины в заголовке корня: `max-width 1440px по центру`. */
export const EXPORT_ROOT_MAX_WIDTH = 'max-width'

/** Хвост подписи ограничения ширины в заголовке корня. */
export const EXPORT_ROOT_CENTERED = 'по центру'

/** Значение `margin` корня с `exportMaxWidth`: центрирование по горизонтали. */
export const EXPORT_ROOT_MARGIN = '0 auto'

/** Текст предупреждения об отброшенном свойстве; после него — имя свойства в кавычках. */
export const EXPORT_WARNING_UNSAFE_VALUE = 'внимание: отброшено небезопасное значение свойства'

/** Текст предупреждения о замене недопустимого тега. */
export const EXPORT_WARNING_TAG_REPLACED = 'внимание: недопустимый тег заменён на div'

/** Допустимое имя CSS-свойства в выводе: слова из строчной латиницы через одиночный дефис (`grid-template-columns`). */
export const EXPORT_CSS_PROPERTY_PATTERN = /^[a-z]+(-[a-z]+)*$/

/** Тег, которым заменяется недопустимый тег блока. */
export const EXPORT_FALLBACK_TAG = 'div'

/** Тег плейсхолдера связи (до подстановки источника в 8.7). */
export const EXPORT_LINK_TAG = 'div'

/** Начало комментария плейсхолдера связи: `компонент «KPI-плашка»`. */
export const EXPORT_LINK_COMPONENT = 'компонент'

/** Разделитель слов в комментарии: подпись и `×N`, заголовок корня и пометки. */
export const EXPORT_WORD_SEPARATOR = ' '

/** Замены для значения HTML-атрибута в двойных кавычках; `&` первым, чтобы не задвоить сущности. */
export const EXPORT_ATTR_ESCAPES: readonly (readonly [RegExp, string])[] = [
  [/&/g, '&amp;'],
  [/"/g, '&quot;'],
  [/</g, '&lt;'],
  [/>/g, '&gt;'],
]

/** Замены для текста комментария: `&` и `<` (`>` оставляем ради читаемости «a > b»); `&` первым. */
export const EXPORT_COMMENT_ESCAPES: readonly (readonly [RegExp, string])[] = [
  [/&/g, '&amp;'],
  [/</g, '&lt;'],
]

/** Дефис, за которым идёт ещё один: два дефиса подряд в комментарии недопустимы (`-->`, `--!>`). */
export const EXPORT_DOUBLE_HYPHEN = /-(?=-)/g

/** Чем заменяется найденный `EXPORT_DOUBLE_HYPHEN`: `---` → `- - -`. */
export const EXPORT_HYPHEN_SPLIT = '- '

/** Замена управляющих и невидимых символов в тексте комментария. */
export const EXPORT_CONTROL_REPLACEMENT = ' '

/**
 * Управляющие и невидимые символы, кроме `\n`: C0 (табы, `\r`, NUL), DEL, C1 (U+0080–U+009F, включая NEL),
 * разделители строк и абзацев U+2028/U+2029 и bidi-управление (U+202A–U+202E, U+2066–U+2069),
 * которое может визуально переставить текст комментария.
 */
/* eslint-disable no-control-regex -- цель регулярки именно управляющие символы */
export const EXPORT_CONTROL_EXCEPT_NEWLINE =
  /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g
/* eslint-enable no-control-regex */

/** То же, что `EXPORT_CONTROL_EXCEPT_NEWLINE`, плюс `\n`: для однострочных подписей и отдельных строк описания. */
// eslint-disable-next-line no-control-regex -- цель регулярки именно управляющие символы
export const EXPORT_CONTROL_ALL = /[\u0000-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]/g

/** Любой перевод строки в описании: `\r\n`, `\r`, `\n`, NEL (U+0085), U+2028, U+2029. */
export const EXPORT_LINE_BREAK = /\r\n|\r|\n|\u0085|\u2028|\u2029/
