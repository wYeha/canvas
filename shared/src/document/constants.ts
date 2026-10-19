/** Константы модели документа: версия схемы и допустимые значения перечислений (теги, flex- и grid-свойства). */

/** Текущая версия формата документа; меняется только вместе с миграцией старых документов. */
export const SCHEMA_VERSION = 1

/** Семантические теги, которые можно назначить блоку. */
export const LAYOUT_TAGS = ['div', 'header', 'aside', 'main', 'section', 'nav', 'footer'] as const

/** Значения `flex-direction`. */
export const FLEX_DIRECTIONS = ['row', 'column', 'row-reverse', 'column-reverse'] as const

/** Значения `justify-content` во flex-контейнере. */
export const FLEX_JUSTIFY_VALUES = [
  'flex-start',
  'center',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
] as const

/** Значения `align-items` во flex-контейнере. */
export const FLEX_ALIGN_VALUES = ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'] as const

/** Значения `justify-items` и `align-items` в grid-контейнере. */
export const GRID_ALIGN_VALUES = ['start', 'center', 'end', 'stretch'] as const

/** Режимы связи: слияние источника с целью или вложение источника ребёнком цели. Вычисляются, не хранятся. */
export const LINK_MODE = { merge: 'merge', embed: 'embed' } as const
