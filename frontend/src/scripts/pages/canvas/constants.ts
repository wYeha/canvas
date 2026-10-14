/** Константы страницы canvas: значения по умолчанию для новых блоков, корневых блоков, документов и камеры. */
import type { FlexContainer, GridContainer, LayoutTag } from '@shared'
import type { Camera, Insets } from './camera'

/** Семантический тег нового блока. */
export const DEFAULT_TAG: LayoutTag = 'div'

/** Число повторов нового блока. */
export const DEFAULT_REPEAT = 1

/** Flex-контейнер нового блока, кроме `kind`. */
export const DEFAULT_FLEX: Omit<FlexContainer, 'kind'> = {
  direction: 'row',
  wrap: false,
  justify: 'flex-start',
  align: 'stretch',
  gap: null,
}

/** Grid-контейнер нового блока, кроме `kind`: две равные колонки. */
export const DEFAULT_GRID: Omit<GridContainer, 'kind'> = {
  columns: 'repeat(2, 1fr)',
  rows: 'auto',
  justifyItems: 'stretch',
  alignItems: 'stretch',
  columnGap: null,
  rowGap: null,
}

/** Направление flex у нового корневого блока: страница обычно собирается сверху вниз. */
export const DEFAULT_ROOT_FLEX_DIRECTION: FlexContainer['direction'] = 'column'

/** Ширина превью нового корневого блока, px. */
export const DEFAULT_ROOT_WIDTH = 1440

/** Название нового документа. */
export const DEFAULT_DOCUMENT_NAME = 'Без названия'

/** Префикс автоподписи блока: `Блок-N`. */
export const AUTO_LABEL_PREFIX = 'Блок-'

/** Зазор между корнем и его копией при дублировании, px: копия встаёт справа, чтобы её было видно сразу. */
export const DUPLICATE_ROOT_GAP = 80

/** Минимальный зум камеры (10%). */
export const ZOOM_MIN = 0.1

/** Максимальный зум камеры (400%). */
export const ZOOM_MAX = 4

/** Ступени зума для кнопок и хоткеев: от `ZOOM_MIN` до `ZOOM_MAX` по возрастанию. */
export const ZOOM_STEPS: readonly number[] = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]

/** Допуск сравнения зума со ступенью: 1.0000001 считается ступенью 100%. */
export const ZOOM_STEP_EPSILON = 1e-6

/** Начальная камера: начало поля в левом верхнем углу viewport, 100%. */
export const DEFAULT_CAMERA: Readonly<Camera> = { x: 0, y: 0, zoom: 1 }

/** Отступ от краёв видимой области при вписывании, экранные px. */
export const FIT_PADDING = 48

/** Предел зума «вписать всё»: мелкий макет не раздувается больше 100%. */
export const FIT_ALL_MAX_ZOOM = 1

/**
 * Вставки видимой области канваса, которые занимают плавающие панели, экранные px.
 * Повторяют SCSS: left = `$layers-width` + `$panel-gap` (248 + 12), right = `$props-width` + `$panel-gap`
 * (288 + 12), bottom = `$pill-height` + 2 · `$panel-gap` (32 + 24), top = 0. При изменении переменных править оба места.
 */
export const CANVAS_SAFE_INSETS: Readonly<Insets> = { top: 0, right: 300, bottom: 56, left: 260 }

/** Шаг точек сетки поля в координатах поля, px. Повторяет SCSS `$canvas-grid-step`. */
export const CANVAS_GRID_STEP = 16

/** Минимальный экранный шаг точек: мельче — шаг удваивается, чтобы фон не сливался в серую кашу. */
export const GRID_MIN_SCREEN_STEP = 8

/** Максимальный экранный шаг точек: крупнее — шаг делится пополам. */
export const GRID_MAX_SCREEN_STEP = 32

/** Высота «строки» колеса в px для `deltaMode = 1` (DOM_DELTA_LINE, Firefox). */
export const WHEEL_LINE_HEIGHT = 16

/** Высота «страницы» колеса в px для `deltaMode = 2` (DOM_DELTA_PAGE). */
export const WHEEL_PAGE_HEIGHT = 800

/** Чувствительность зума колесом: `factor = exp(-deltaY * k)`. */
export const WHEEL_ZOOM_SENSITIVITY = 0.005

/** Предел |deltaY| для зума: щелчок колеса мыши (~100) даёт ~×0.82, щипок тачпада (1–10) — плавно. */
export const WHEEL_ZOOM_MAX_DELTA = 40

/** Код основной (левой) кнопки мыши в `PointerEvent.button`. */
export const PRIMARY_BUTTON = 0

/** Код средней кнопки мыши в `PointerEvent.button`. */
export const MIDDLE_BUTTON = 1

/** `KeyboardEvent.code` пробела. */
export const SPACE_CODE = 'Space'

/** `WheelEvent.deltaMode`: дельта в строках (DOM_DELTA_LINE). */
export const WHEEL_DELTA_LINE = 1

/** `WheelEvent.deltaMode`: дельта в страницах (DOM_DELTA_PAGE). */
export const WHEEL_DELTA_PAGE = 2

/** Значение `flex-direction` по умолчанию в CSS: такое не выводится в стили. */
export const CSS_DEFAULT_FLEX_DIRECTION = 'row'

/** Значение `justify-content` по умолчанию в CSS. */
export const CSS_DEFAULT_JUSTIFY_CONTENT = 'flex-start'

/** Значение `align-items` / `justify-items` по умолчанию в CSS. */
export const CSS_DEFAULT_ALIGN = 'stretch'

/** Значение `grid-template-rows`, равное поведению по умолчанию. */
export const CSS_DEFAULT_GRID_ROWS = 'auto'

/** Значение `flex-wrap` для включённого переноса. */
export const CSS_FLEX_WRAP = 'wrap'

/** Значение `display` для flex-контейнера. */
export const CSS_DISPLAY_FLEX = 'flex'

/** Значение `display` для grid-контейнера. */
export const CSS_DISPLAY_GRID = 'grid'

/** Единица измерения отступов и размеров, хранящихся числами. */
export const CSS_PX_UNIT = 'px'

/** Ключевое слово `span` для `grid-column` / `grid-row`. */
export const CSS_GRID_SPAN = 'span'

/** Минимальный span, ниже которого `grid-column` / `grid-row` не выводятся. */
export const CSS_MIN_SPAN = 1

/** Разделитель деклараций в инлайн-стиле для экспорта. */
export const INLINE_STYLE_SEPARATOR = '; '

/** Размер палитры блоков: цвет блока берётся по `depth % BLOCK_PALETTE_SIZE`. */
export const BLOCK_PALETTE_SIZE = 8

/** Значки направления контейнера в чипе подписи. */
export const DIRECTION_ICONS = {
  row: '→',
  column: '↓',
  'row-reverse': '←',
  'column-reverse': '↑',
  grid: '#',
} as const

/** Значок плашки связи. */
export const LINK_ICON = '→'

/** Подпись источника связи, если корень не найден. */
export const LINK_MISSING_LABEL = 'без источника'

/** Подпись корня, если у блока нет подписи. */
export const ROOT_UNTITLED_LABEL = 'Без подписи'

/** Разделитель подписи корня и ширины превью. */
export const ROOT_TITLE_SEPARATOR = ' · '

/** Имя параметра URL, включающего демо-документ (только в dev). */
export const DEMO_QUERY_PARAM = 'demo'

/** Порог клика, экранные px: сдвиг указателя между нажатием и отпусканием больше порога — это перетаскивание. */
export const CLICK_DRAG_THRESHOLD = 4

/** Имя атрибута, которым помечены элементы блоков и плашек связей: по нему ищется цель клика. */
export const NODE_ID_ATTR = 'data-node-id'

/** CSS-селектор элемента, помеченного id узла. */
export const NODE_SELECTOR = `[${NODE_ID_ATTR}]`

/** CSS-селектор слоя мира: от его положения на экране считаются координаты поля. */
export const WORLD_SELECTOR = '[data-canvas-world]'

/** Разделитель частей бейджа выделения: `подпись · тип · Ш×В`. */
export const BADGE_SEPARATOR = ' · '

/** Разделитель ширины и высоты в бейдже. */
export const SIZE_SEPARATOR = '×'

/** Тип узла-плашки связи в бейдже. */
export const LINK_TYPE_LABEL = 'связь'

/** Разделитель сегментов плашки пути. */
export const BREADCRUMB_SEPARATOR = '›'

/** Текст плашки пути без выделения. */
export const BREADCRUMB_EMPTY = '—'

/**
 * Высота зоны над блоком, где помещается бейдж, экранные px; ближе к верху поля бейдж уходит внутрь блока.
 * Повторяет SCSS `$selection-badge-offset`.
 */
export const SELECTION_BADGE_OFFSET = 20

/** `KeyboardEvent.code` Escape. */
export const ESCAPE_CODE = 'Escape'

/** `KeyboardEvent.code` Enter. */
export const ENTER_CODE = 'Enter'

/** `KeyboardEvent.code` Enter на цифровой клавиатуре. */
export const NUMPAD_ENTER_CODE = 'NumpadEnter'
