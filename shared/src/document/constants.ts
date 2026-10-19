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

/**
 * Тип узла-плашки из старых документов (до упрощения в 8.1). Такие узлы при разборе молча отбрасываются,
 * поэтому версия схемы не меняется: старые сохранения и `.json` открываются без них.
 */
export const LEGACY_LINK_NODE_TYPE = 'link'

/** Число повторов корневого блока: у корня повтора нет, при разборе документа `repeat` корня приводится к этому значению. */
export const ROOT_REPEAT = 1
