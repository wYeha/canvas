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
