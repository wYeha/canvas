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

/** Режимы размера по оси «как ребёнок», кроме «по содержимому» (это отсутствие поля): заполнить или фиксированный. */
export const SIZE_MODES = ['fill', 'fixed'] as const

/** Токены зазора между детьми контейнера (без поля — без зазора): маленький, средний, большой. */
export const GAP_TOKENS = ['s', 'm', 'l'] as const

/**
 * Тип узла-плашки из старых документов (до упрощения 8.1). Теперь связь — блок с `sourceId`, поэтому при разборе
 * такие узлы превращаются в блоки-связи; версия схемы не меняется.
 */
export const LEGACY_LINK_NODE_TYPE = 'link'

/** Число повторов корневого блока: у корня повтора нет, при разборе документа `repeat` корня приводится к этому значению. */
export const ROOT_REPEAT = 1

/** Поля блока-связи, полученного из плашки старого формата (кроме id, `sourceId`, `self`, повтора и детей). */
export const LEGACY_LINK_BLOCK_DEFAULTS = {
  type: 'block',
  label: '',
  description: '',
  tag: 'div',
  container: { kind: 'flex', direction: 'row', wrap: false, justify: 'flex-start', align: 'stretch' },
  repeat: 1,
} as const
