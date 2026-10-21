/** Константы страницы canvas: значения по умолчанию для новых блоков, корневых блоков, документов и камеры. */
import type { FlexContainer, GridContainer, LayoutTag } from '@shared'
import type { Camera, Insets, Size } from './camera'

/** Семантический тег нового блока. */
export const DEFAULT_TAG: LayoutTag = 'div'

/** Число повторов нового блока. */
export const DEFAULT_REPEAT = 1

/** Наибольшее число повторов в поле «Повтор» (и на канвасе: больше копий не рисуется даже у импортированных данных). */
export const REPEAT_MAX = 24

/**
 * Общий бюджет отрисовки копий повтора на одно дерево корня: сумма размеров (число блоков) всех копий.
 * Копия, которая не вмещается в остаток, не рисуется (исходные блоки рисуются всегда): вложенные 24 × 24 × 24
 * иначе дали бы тысячи элементов и подвесили канвас.
 */
export const REPEAT_RENDER_BUDGET = 500

/** Знак повтора после подписи на канвасе и в «Слоях»: `×3`. */
export const REPEAT_MARK = '×'

/** Разделитель ключа копии повтора в `v-for`: `<id>#<номер копии>`. */
export const REPEAT_KEY_SEPARATOR = '#'

/** Flex-контейнер нового блока, кроме `kind`. */
export const DEFAULT_FLEX: Omit<FlexContainer, 'kind'> = {
  direction: 'row',
  wrap: false,
  justify: 'flex-start',
  align: 'stretch',
}

/** Grid-контейнер нового блока, кроме `kind`: две равные колонки. */
export const DEFAULT_GRID: Omit<GridContainer, 'kind'> = {
  columns: 'repeat(2, 1fr)',
  rows: 'auto',
  justifyItems: 'stretch',
  alignItems: 'stretch',
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

/**
 * Фиксированный внутренний отступ каждого блока на канвасе, px — как SCSS `$block-padding`. Только редактор:
 * в модели и экспорте его нет; нужен, чтобы вычесть его из замеров превью.
 */
export const BLOCK_PADDING_PX = 20

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

/** Пауза после последнего изменения камеры, мс: по её истечении жест считается законченным и слой мира перерисовывается чётко. */
export const CAMERA_SETTLE_DELAY_MS = 150

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

/** Бит основной кнопки в маске `PointerEvent.buttons`: кнопка сейчас зажата. */
export const PRIMARY_BUTTON_MASK = 1

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

/** Значение `flex` «как ребёнок» по умолчанию в CSS: у новых блоков задано сразу, в стили не выводится. */
export const CSS_DEFAULT_FLEX = '0 1 auto'

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

/**
 * `flex` ребёнка в режиме «Заполнить» по главной оси родителя: `1` (= `1 1 0%`), делит место поровну. Не `1 1 0`:
 * вместе с `min-height:0` в колонке без заданной высоты блок с базисом 0 схлопывается в ноль, а `0%` там считается
 * как `auto` (размер по содержимому).
 */
export const CSS_FLEX_FILL = '1'

/** `flex` ребёнка в режиме «Фиксированный» по главной оси: не растягивается и не сжимается. */
export const CSS_FLEX_NONE = 'none'

/** Значение `align-self` / `justify-self` для «Заполнить» по поперечной оси и в grid. */
export const CSS_STRETCH = 'stretch'

/** `min-width` / `min-height` для «Заполнить» по главной оси: иначе длинное содержимое распирает блок. */
export const CSS_MIN_ZERO = '0'

/** Прилипание по умолчанию при выборе «Прилипает»: к верху (заголовок группы в списке). */
export const POSITION_DEFAULT_STICKY = 'sticky-top' as const

/** Угол по умолчанию при выборе «Поверх»: правый верхний (значок, счётчик, точка «онлайн»). */
export const POSITION_DEFAULT_CORNER = 'top-right' as const

/** Стили положения ребёнка (15.3): прилипание к краю или угол родителя; нулевые отступы — у самого края. */
export const POSITION_STYLE_ENTRIES = {
  'sticky-top': [
    ['position', 'sticky'],
    ['top', '0'],
  ],
  'sticky-bottom': [
    ['position', 'sticky'],
    ['bottom', '0'],
  ],
  'top-left': [
    ['position', 'absolute'],
    ['top', '0'],
    ['left', '0'],
  ],
  'top-right': [
    ['position', 'absolute'],
    ['top', '0'],
    ['right', '0'],
  ],
  'bottom-left': [
    ['position', 'absolute'],
    ['bottom', '0'],
    ['left', '0'],
  ],
  'bottom-right': [
    ['position', 'absolute'],
    ['bottom', '0'],
    ['right', '0'],
  ],
} as const

/** `position` родителя, у которого есть дети поверх него: точка отсчёта для их углов. */
export const CSS_POSITION_ANCHOR = 'relative'

/** Допуск у края области прокрутки, px: дробные `scrollTop` при зуме не должны считаться «ещё есть куда». */
export const SCROLL_EDGE_EPSILON = 1

/** Модификатор блока-области прокрутки по оси: `canvas-node--scroll-y`. */
export const SCROLL_NODE_CLASS_PREFIX = 'canvas-node--scroll-'

/** Значение `overflow-*` у области прокрутки. */
export const CSS_OVERFLOW_AUTO = 'auto'

/** CSS-свойство прокрутки по оси `scroll` контейнера. */
export const SCROLL_OVERFLOW_PROPERTY = { y: 'overflow-y', x: 'overflow-x' } as const

/** Ось размера, вдоль которой идёт прокрутка: `y` — высота, `x` — ширина. */
export const SCROLL_SIZE_AXIS = { y: 'height', x: 'width' } as const

/** Значения токенов зазора в px (TOKENS.md): превью и определения переменных в экспорте. */
export const GAP_TOKEN_PX = { s: 8, m: 16, l: 32 } as const

/** Префикс CSS-переменной зазора: `--gap-m`. */
export const GAP_VAR_PREFIX = '--gap-'

/** С какого числа детей зазор имеет смысл и выводится. */
export const MIN_CHILDREN_FOR_GAP = 2

/** Зазор новых блоков: средний (раньше у всех блоков был фиксированный редакторский 16px). */
export const DEFAULT_GAP = 'm' as const

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

/** Подпись корня, если у блока нет подписи. */
export const ROOT_UNTITLED_LABEL = 'Без подписи'

/** Значок связи (плашка, бейдж, путь, заголовок свойств): пунктирная стрелка, отличная от стрелок направления flex. */
export const LINK_ICON = '⇢'

/** Тип связи в бейдже выделения и строке «Слоёв». */
export const LINK_TYPE_LABEL = 'связь'

/** Подпись связи, источника которой нет (временное состояние посреди операции). */
export const LINK_MISSING_LABEL = 'источник не найден'

/** Подпись поля источника в секции «Связь». */
export const LINK_SOURCE_LABEL = 'Источник'

/** Кнопка перехода к источнику в секции «Связь». */
export const LINK_GO_TO_SOURCE_LABEL = 'Перейти к источнику'

/** Подпись строки ширин в секции «Связь». */
export const LINK_WIDTH_LABEL = 'Ширина'

/** Подписи ширин в строке «источник: 480px / место: 456px». */
export const LINK_WIDTH_PARTS = { source: 'источник', place: 'место' } as const

/** Ширина места не замерена (плашка не отрисована). */
export const LINK_WIDTH_UNKNOWN = '—'

/** Кнопка «Подогнать»: ширина превью источника станет равна ширине места. */
export const LINK_FIT_LABEL = 'Подогнать'

/** Подсказка кнопки «Подогнать». */
export const LINK_FIT_TITLE = 'Ширина превью источника станет равна ширине места связи'

/** Подсказка недоступной кнопки «Подогнать»: ширины уже совпадают или место не замерено. */
export const LINK_FIT_DISABLED_TITLE = 'Ширина источника уже совпадает с местом'

/** Разделитель подписи корня и ширины превью. */
export const ROOT_TITLE_SEPARATOR = ' · '

/** Имя параметра URL, включающего демо-документ (только в dev). */
export const DEMO_QUERY_PARAM = 'demo'

/** Порог клика, экранные px: сдвиг указателя между нажатием и отпусканием больше порога — это перетаскивание. */
export const CLICK_DRAG_THRESHOLD = 4

/**
 * Наибольший экранный размер призрака перетаскивания, px: крупный блок (страница 1440) уменьшается
 * с сохранением пропорций, иначе призрак закрыл бы поле. Повторено в TOKENS.md.
 */
export const DRAG_GHOST_MAX_SIZE: Readonly<Size> = { width: 320, height: 200 }

/** Полоса у края видимого поля, в которой во время перетаскивания включается автопан, экранные px. */
export const DRAG_AUTOPAN_MARGIN_PX = 48

/** Максимальная скорость автопана за кадр, экранные px. */
export const DRAG_AUTOPAN_MAX_SPEED_PX = 12

/**
 * Допуск разбиения детей flex-блока с переносом на линии, экранные px: ребёнок начинает новую линию, только если
 * начинается раньше конца предыдущего больше чем на допуск (субпиксельные погрешности замера — не перенос).
 */
export const FLEX_LINE_EPSILON = 1

/** Толщина полосы линии вставки при перетаскивании, экранные px. */
export const DROP_INSERT_LINE_WIDTH = 2

/** Радиус точек на концах линии вставки, экранные px (рисуются в SCSS). */
export const DROP_INSERT_DOT_RADIUS = 3

/** Имя атрибута, которым помечены элементы блоков: по нему ищется цель клика. */
export const NODE_ID_ATTR = 'data-node-id'

/** CSS-селектор элемента, помеченного id узла. */
export const NODE_SELECTOR = `[${NODE_ID_ATTR}]`

/**
 * Имя атрибута копии повтора на канвасе (копия и всё внутри неё): значение — id исходного блока с повтором.
 * У копий нет `data-node-id`, поэтому замеры, оверлей выделения и поиск приёмника их не видят.
 */
export const REPEAT_OF_ATTR = 'data-repeat-of'

/** CSS-селектор ближайшего блока или копии повтора: цель клика, ховера и двойного клика. */
export const NODE_OR_REPEAT_SELECTOR = `${NODE_SELECTOR}, [${REPEAT_OF_ATTR}]`

/** Имя атрибута заголовка корня на поле: за него корень перетаскивают по полю, клик по нему выделяет корень. */
export const ROOT_HANDLE_ATTR = 'data-root-handle-id'

/** CSS-селектор заголовка корня на поле. */
export const ROOT_HANDLE_SELECTOR = `[${ROOT_HANDLE_ATTR}]`

/** Атрибут порта связи у корня: id корня-источника; нажатие на порт начинает протягивание новой связи. */
export const LINK_PORT_ATTR = 'data-link-port-id'

/** Селектор порта связи. */
export const LINK_PORT_SELECTOR = `[${LINK_PORT_ATTR}]`

/** Id маркеров-наконечников стрелок связей (обычный и акцентный) в разметке SVG-слоя. */
export const LINK_ARROW_MARKERS = { idle: 'canvas-links-head', active: 'canvas-links-head-active' } as const

/** Размер наконечника стрелки связи на экране, px (в координатах поля делится на зум). */
export const LINK_ARROW_HEAD_PX = 8

/** Атрибут ручки на конце стрелки связи: id связи; потянуть — перепривязать связь к другому блоку. */
export const LINK_END_ATTR = 'data-link-end-id'

/** Селектор ручки конца стрелки связи. */
export const LINK_END_SELECTOR = `[${LINK_END_ATTR}]`

/** Радиус ручки конца стрелки на экране, px (в координатах поля делится на зум). */
export const LINK_END_HANDLE_PX = 8

/** Подсказка ручки конца стрелки. */
export const LINK_END_TITLE = 'Протяните на другой блок, чтобы перенести связь туда'

/** Подсказка порта связи у корня. */
export const LINK_PORT_TITLE = 'Протяните на блок, чтобы подключить туда этот корневой блок'

/** Имя атрибута подписи блока на канвасе (заголовок корня, чип, подпись листа): двойной клик по ней переименовывает блок. */
export const LABEL_NODE_ATTR = 'data-label-node-id'

/** CSS-селектор подписи блока на канвасе. */
export const LABEL_NODE_SELECTOR = `[${LABEL_NODE_ATTR}]`

/** BEM-модификатор поля: подписи блоков (чипы и подписи листов) скрыты; заголовки корней остаются. */
export const VIEWPORT_LABELS_HIDDEN_CLASS = 'canvas-viewport--labels-hidden'

/** CSS-селектор поля со скрытыми подписями: по нему двойной клик не попадает в скрытую подпись. */
export const VIEWPORT_LABELS_HIDDEN_SELECTOR = `.${VIEWPORT_LABELS_HIDDEN_CLASS}`

/** Постоянное доступное имя (`aria-label`) переключателя подписей; состояние отдаёт `aria-pressed`. */
export const LABELS_TOGGLE_LABEL = 'Показывать подписи'

/** Подсказка (`title`) кнопки-переключателя подписей, когда подписи показаны (нажатие скрывает). */
export const LABELS_HIDE_TITLE = 'Скрыть подписи'

/** Подсказка (`title`) кнопки-переключателя подписей, когда подписи скрыты (нажатие показывает). */
export const LABELS_SHOW_TITLE = 'Показать подписи'

/** Подпись переключателя «все стрелки связей» (для скринридера). */
export const ARROWS_TOGGLE_LABEL = 'Все стрелки связей'

/** Подсказка включённого «все стрелки»: что случится по нажатию. */
export const ARROWS_SELECTED_TITLE = 'Стрелки только у выделенной связи и её источника'

/** Подсказка выключенного «все стрелки»: что случится по нажатию. */
export const ARROWS_ALL_TITLE = 'Показать стрелки всех связей'

/** Подпись переключателя живого зеркала связей (для скринридера). */
export const MIRROR_TOGGLE_LABEL = 'Живое зеркало связей'

/** Подсказка включённого зеркала: что случится по нажатию. */
export const MIRROR_HIDE_TITLE = 'Связи плашками'

/** Подсказка выключенного зеркала: что случится по нажатию. */
export const MIRROR_SHOW_TITLE = 'Живое зеркало: содержимое источника на месте связей'

/** Имя атрибута строки панели «Слои»: по нему наведение на строку подсвечивает блок на канвасе. */
export const LAYER_ID_ATTR = 'data-layer-id'

/** CSS-селектор строки панели «Слои», помеченной id узла. */
export const LAYER_SELECTOR = `[${LAYER_ID_ATTR}]`

/** Кнопка сворачивания ветки в строке «Слоёв» — с неё перетаскивание не начинается. */
export const LAYER_ITEM_TOGGLE_SELECTOR = '.canvas-layer-item__toggle'

/** Поле переименования в строке «Слоёв» — с него перетаскивание не начинается. */
export const LAYER_ITEM_EDIT_SELECTOR = '.canvas-layer-item__edit'

/** Подсказка кнопки сворачивания раскрытой ветки в «Слоях». */
export const LAYER_COLLAPSE_LABEL = 'Свернуть'

/** Подсказка кнопки сворачивания свёрнутой ветки в «Слоях». */
export const LAYER_EXPAND_LABEL = 'Развернуть'

/** Ширина колонки шеврона строки «Слоёв», px — как SCSS `$layer-toggle-width`. */
export const LAYER_TOGGLE_WIDTH_PX = 18

/** Отступ вложенного уровня в «Слоях», px — как SCSS `$layer-indent`. */
export const LAYER_INDENT_PX = 12

/** Верхняя граница зоны «до» в строке «Слоёв» (доля высоты строки). */
export const LAYER_DROP_ZONE_BEFORE_RATIO = 1 / 3

/** Нижняя граница зоны «внутрь» (доля высоты; ниже — зона «после»). */
export const LAYER_DROP_ZONE_AFTER_RATIO = 2 / 3

/** Толщина линии вставки в «Слоях», экранные px. */
export const LAYER_DROP_LINE_WIDTH = DROP_INSERT_LINE_WIDTH

/** Пустое состояние панели «Слои». */
export const LAYERS_EMPTY_TEXT = 'Нет блоков'

/** Доступное имя списка слоёв. */
export const LAYERS_LIST_LABEL = 'Дерево блоков'

/** CSS-селектор слоя мира: от его положения на экране считаются координаты поля. */
export const WORLD_SELECTOR = '[data-canvas-world]'

/** Разделитель частей бейджа выделения: `подпись · тип · Ш×В`. */
export const BADGE_SEPARATOR = ' · '

/** Разделитель ширины и высоты в бейдже. */
export const SIZE_SEPARATOR = '×'

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

/** Подписи секций панели свойств по id. */
export const PROPS_SECTION_TITLES = {
  preview: 'Ширина превью',
  block: 'Блок',
  container: 'Контейнер',
  child: 'Как ребёнок',
  link: 'Связь',
} as const

/** Разделитель частей меты в заголовке панели свойств. */
export const PROPS_META_SEPARATOR = ' · '

/** Мета корневого блока в заголовке панели свойств. */
export const PROPS_META_ROOT = 'корневой'

/** Приставка меты вложенного блока: `ребёнок grid`. */
export const PROPS_META_CHILD = 'ребёнок'

/** Текст пустого состояния панели свойств. */
export const PROPS_EMPTY_TEXT = 'Ничего не выделено'

/** Подсказка пустого состояния панели свойств. */
export const PROPS_EMPTY_HINT = 'Кликните по блоку'

/** Пресеты ширины превью корневого блока, px. */
export const WIDTH_PRESETS = [1920, 1440, 1280, 1024, 480] as const

/** Минимальная ширина и высота превью, px. */
export const PREVIEW_MIN_SIZE = 1

/** Шаг стрелок в числовых полях размеров превью, px. */
export const PREVIEW_SIZE_STEP = 10

/** Высота, которую получает корень при переключении на «фиксированная», если замера нет, px. */
export const PREVIEW_FALLBACK_HEIGHT = 600

/** Режимы высоты превью: по содержимому или фиксированная. */
export const HEIGHT_MODE = { content: 'content', fixed: 'fixed' } as const

/** Подписи режимов высоты превью. */
export const HEIGHT_MODE_LABELS = { content: 'По содержимому', fixed: 'Фиксированная' } as const

/** Подпись поля «Ширина» панели свойств. */
export const PREVIEW_WIDTH_LABEL = 'Ширина'

/** Подпись группы пресетов ширины (для скринридера). */
export const PREVIEW_PRESETS_LABEL = 'Пресеты ширины'

/** Подпись поля «Высота» панели свойств. */
export const PREVIEW_HEIGHT_LABEL = 'Высота'

/** Подпись числового поля фиксированной высоты. */
export const PREVIEW_HEIGHT_VALUE_LABEL = 'Высота, px'

/** Подпись переключателя экспорта как max-width. */
export const PREVIEW_MAX_WIDTH_LABEL = 'Экспортировать как max-width'

/** Подпись переключателя «экран целиком» у корня. */
export const PREVIEW_FULL_SCREEN_LABEL = 'Экран целиком (100vh)'

/** Подсказка переключателя «экран целиком». */
export const PREVIEW_FULL_SCREEN_HINT =
  'В экспорте height: 100vh — страница целиком не прокручивается, прокрутка внутри областей'

/** Высота превью корня при включении «экран целиком», если высота не задана: типичный экран ноутбука. */
export const FULL_SCREEN_PREVIEW_HEIGHT = 900

/** Подсказка под переключателем, когда max-width выключен. */
export const PREVIEW_HINT_OFF = 'Ширина превью в код не попадает — только комментарием'

/** Подсказка под переключателем, когда max-width включён. */
export const PREVIEW_HINT_ON = 'Ширина превью в код уйдёт как max-width + margin: 0 auto'

/** Подпись поля «Подпись» секции «Блок». */
export const BLOCK_LABEL_LABEL = 'Подпись'

/** Подпись поля описания для ИИ. */
export const BLOCK_DESCRIPTION_LABEL = 'Описание для ИИ'

/** Подсказка пустого поля описания. */
export const BLOCK_DESCRIPTION_PLACEHOLDER = 'Что будет внутри: «график выручки по месяцам, легенда справа»'

/** Число видимых строк поля описания. */
export const BLOCK_DESCRIPTION_ROWS = 3

/** Подпись селекта семантического тега. */
export const BLOCK_TAG_LABEL = 'Тег'

/** Подпись переключателя типа контейнера. */
export const CONTAINER_KIND_LABEL = 'Тип'

/** Подпись поля `flex-direction`. */
export const CONTAINER_DIRECTION_LABEL = 'flex-direction'

/** Подпись поля `flex-wrap`. */
export const CONTAINER_WRAP_LABEL = 'flex-wrap'

/** Текст рядом с переключателем переноса. */
export const CONTAINER_WRAP_TEXT = 'перенос'

/** Подпись поля `justify-content`. */
export const CONTAINER_JUSTIFY_LABEL = 'justify-content'

/** Подпись поля `align-items`. */
export const CONTAINER_ALIGN_LABEL = 'align-items'

/** Подпись поля `grid-template-columns`. */
export const GRID_COLUMNS_LABEL = 'grid-template-columns'

/** Подпись группы пресетов колонок для скринридера. */
export const GRID_COLUMNS_PRESETS_LABEL = 'Пресеты колонок'

/** Подпись поля `grid-template-rows`. */
export const GRID_ROWS_LABEL = 'grid-template-rows'

/** Подсказка пустого поля строк: пусто значит `auto`. */
export const GRID_ROWS_PLACEHOLDER = 'auto'

/** Сообщение под полем шаблона, когда значение отклонено. */
export const GRID_TEMPLATE_ERROR = 'Недопустимое значение: пусто или есть ; " < > { }'

/** Подпись поля `justify-items`. */
export const GRID_JUSTIFY_ITEMS_LABEL = 'justify-items'

/** Подпись поля `align-items` в grid. */
export const GRID_ALIGN_ITEMS_LABEL = 'align-items'

/** Значение `grid-template-rows` по умолчанию. */
export const GRID_ROWS_DEFAULT = 'auto'

/** Подпись поля `flex` секции «Как ребёнок». */
export const CHILD_FLEX_LABEL = 'flex'

/** Подпись группы быстрых значений `flex` для скринридера. */
export const CHILD_FLEX_PRESETS_LABEL = 'Быстрые значения flex'

/** Подсказка поля `flex`: пометка «своё» живёт здесь, а имя поля для скринридера — подпись «flex». */
export const CHILD_FLEX_PLACEHOLDER = 'своё, напр. 0 0 280px'

/** Подпись поля `width`. */
export const CHILD_WIDTH_LABEL = 'width'

/** Подпись поля `height`. */
export const CHILD_HEIGHT_LABEL = 'height'

/** Подпись поля `min-height`. */
export const CHILD_MIN_HEIGHT_LABEL = 'min-height'

/** Подсказка пустых полей размеров: пусто значит `auto`. */
export const CHILD_SIZE_PLACEHOLDER = 'auto'

/** Подпись поля `colSpan` (на сколько колонок растянут блок). */
export const CHILD_COL_SPAN_LABEL = 'col span'

/** Подпись поля `rowSpan` (на сколько строк растянут блок). */
export const CHILD_ROW_SPAN_LABEL = 'row span'

/** Подпись поля `repeat` (сколько раз блок повторяется на канвасе и `×N` в экспорте). */
export const CHILD_REPEAT_LABEL = 'Повтор'

/** Подписи полей режима размера. */
export const CHILD_SIZE_LABELS = { width: 'Ширина', height: 'Высота' } as const

/** Сегменты режима размера: по содержимому, заполнить, фиксированный. */
export const CHILD_SIZE_MODE_OPTIONS = [
  { value: 'content', label: 'Авто' },
  { value: 'fill', label: 'Заполнить' },
  { value: 'fixed', label: 'Фикс.' },
] as const

/** Подсказки режимов размера под полем: что попадёт в экспорт. */
export const CHILD_SIZE_MODE_HINTS = {
  content: 'по содержимому — размер не задаётся',
  fillMain: 'делит свободное место с соседями (flex: 1, min-…: 0)',
  flexOverride: 'по этой оси действует свободный flex из «Дополнительно» — он важнее режима',
  fillCross: 'растягивается на всю ширину/высоту родителя',
  fillGrid: 'растягивается на всю ячейку',
  fixed: 'не тянется и не сжимается; число необязательно',
} as const

/** Подпись поля числа фиксированного размера. */
export const CHILD_SIZE_VALUE_LABELS = { width: 'Ширина, число', height: 'Высота, число' } as const

/** Пример в пустом поле числа фиксированного размера. */
export const CHILD_SIZE_VALUE_PLACEHOLDER = 'необязательно, напр. 360px'

/** Заголовок раскрывашки редких свойств «как ребёнок». */
export const CHILD_ADVANCED_TITLE = 'Дополнительно'

/** Подпись поля зазора между детьми контейнера. */
export const CONTAINER_GAP_LABEL = 'Зазор (gap)'

/** Значение сегмента «без зазора». */
export const GAP_NONE = 'none'

/** Сегменты зазора: нет, S, M, L (значения — в TOKENS.md, в экспорте — переменными). */
export const CONTAINER_GAP_OPTIONS = [
  { value: GAP_NONE, label: 'Нет' },
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
] as const

/** Подсказка поля зазора. */
export const CONTAINER_GAP_HINT = 'S 8 · M 16 · L 32 px; в экспорте — var(--gap-…), без пикселей в описаниях'

/** Подпись поля прокрутки содержимого контейнера. */
export const CONTAINER_SCROLL_LABEL = 'Прокрутка'

/** Значение сегмента «без прокрутки». */
export const SCROLL_NONE = 'none'

/** Сегменты прокрутки: нет, по вертикали, по горизонтали. */
export const CONTAINER_SCROLL_OPTIONS = [
  { value: SCROLL_NONE, label: 'Нет' },
  { value: 'y', label: '↕ Вертик.' },
  { value: 'x', label: '↔ Гориз.' },
] as const

/** Подсказка поля прокрутки. */
export const CONTAINER_SCROLL_HINT =
  'Содержимое прокручивается внутри блока: overflow-y / overflow-x: auto. Блоку нужен ограниченный размер — «Заполнить» или «Фикс.»'

/** Подпись поля смыслового элемента. */
export const BLOCK_ELEMENT_LABEL = 'Элемент'

/** Пример в пустом поле смыслового элемента. */
export const BLOCK_ELEMENT_PLACEHOLDER = 'необязательно: h1, button, img, li…'

/** Подсказка поля смыслового элемента. */
export const BLOCK_ELEMENT_HINT =
  'Что это на самом деле: у пустого блока станет тегом в коде (img, input — пометкой в комментарии), у контейнера — пометкой'

/** Текст ошибки поля смыслового элемента. */
export const BLOCK_ELEMENT_ERROR = 'Имя элемента — латиница, цифры и дефис, начиная с буквы'

/** Подсказки списка смыслового элемента: частые элементы, которых нет среди раскладочных тегов. */
export const ELEMENT_SUGGESTIONS = [
  'h1',
  'h2',
  'h3',
  'p',
  'a',
  'button',
  'img',
  'input',
  'textarea',
  'select',
  'label',
  'ul',
  'ol',
  'li',
  'dl',
  'article',
  'figure',
  'form',
  'table',
  'time',
  'small',
  'address',
  'svg',
  'video',
  'hr',
] as const

/**
 * Элементы, которые экспорт может поставить тегом листа: в них помещается комментарий с подписью. Пустые (`img`,
 * `input`, `hr`) и с текстовым содержимым (`textarea`) — только пометкой в комментарии.
 */
export const LEAF_ELEMENT_TAGS: ReadonlySet<string> = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'span',
  'a',
  'button',
  'label',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'article',
  'figure',
  'figcaption',
  'form',
  'table',
  'select',
  'time',
  'small',
  'strong',
  'em',
  'address',
  'blockquote',
  'pre',
  'code',
  'svg',
  'video',
  'picture',
])

/** Разделитель пометки элемента и подписи в комментарии экспорта: `img: avatar`. */
export const ELEMENT_COMMENT_SEPARATOR = ': '

/** Подпись переключателя положения блока в родителе. */
export const CHILD_POSITION_LABEL = 'Положение'

/** Сегменты вида положения: обычно, прилипает, поверх родителя. */
export const CHILD_POSITION_KIND_OPTIONS = [
  { value: 'static', label: 'Обычно' },
  { value: 'sticky', label: 'Прилипает' },
  { value: 'overlay', label: 'Поверх' },
] as const

/** Подсказки вида положения: что попадёт в экспорт. */
export const CHILD_POSITION_HINTS = {
  static: 'в потоке родителя, как соседи',
  sticky: 'position: sticky — держится у края прокручиваемой области (заголовок группы, шапка таблицы)',
  overlay: 'position: absolute в углу родителя, родитель получает position: relative (значок, счётчик, точка «онлайн»)',
} as const

/** Подпись переключателя края прилипания. */
export const CHILD_STICKY_SIDE_LABEL = 'Прилипает к краю'

/** Сегменты края прилипания. */
export const CHILD_STICKY_SIDE_OPTIONS = [
  { value: 'sticky-top', label: 'Сверху' },
  { value: 'sticky-bottom', label: 'Снизу' },
] as const

/** Подпись переключателя угла родителя. */
export const CHILD_CORNER_LABEL = 'Угол родителя'

/** Сегменты угла: значок-стрелка на кнопке, подпись — имя для скринридера и подсказка. */
export const CHILD_CORNER_OPTIONS = [
  { value: 'top-left', label: 'Сверху слева', glyph: '↖', iconOnly: true },
  { value: 'top-right', label: 'Сверху справа', glyph: '↗', iconOnly: true },
  { value: 'bottom-left', label: 'Снизу слева', glyph: '↙', iconOnly: true },
  { value: 'bottom-right', label: 'Снизу справа', glyph: '↘', iconOnly: true },
] as const

/** Подпись поля min-width. */
export const CHILD_MIN_WIDTH_LABEL = 'min-width'

/** Подпись поля max-width. */
export const CHILD_MAX_WIDTH_LABEL = 'max-width'

/** Минимальный span (1 = не задан). */
export const CHILD_SPAN_MIN = 1

/** Сообщение под полем «как ребёнок», когда значение отклонено. */
export const CHILD_VALUE_ERROR = 'Недопустимое значение: есть ; " < > { }'

/** Значение `auto` в полях размеров: равно «не задано». */
export const CHILD_AUTO_VALUE = 'auto'

/** Быстрые значения `flex`, кроме значения по умолчанию (оно идёт первым чипом). */
export const CHILD_FLEX_QUICK_VALUES = ['1', 'auto', 'none'] as const

/** Префикс подсказки секции «Как ребёнок»: «в flex →», «в grid ×N». */
export const CHILD_HINT_PREFIX = 'в'

/** Знак числа колонок в подсказке «в grid ×N». */
export const CHILD_HINT_TIMES = '×'

/** Стрелки направления flex-родителя в подсказке секции. */
export const CHILD_HINT_ARROWS = {
  row: '→',
  'row-reverse': '←',
  column: '↓',
  'column-reverse': '↑',
} as const

/** `KeyboardEvent.code` клавиши E: Ctrl+E открывает окно экспорта (по коду, чтобы работало в любой раскладке). */
export const EXPORT_HOTKEY_CODE = 'KeyE'

/** `KeyboardEvent.key` окна горячих клавиш: `?` (Shift + `/`; по символу, а не по коду: на других раскладках `?` стоит на другой клавише). */
export const HELP_HOTKEY_KEY = '?'

/** Значение `aria-keyshortcuts` кнопки «Экспорт». */
export const EXPORT_KEYSHORTCUTS = 'Control+E'

/** Подсказка клавиши на кнопке «Экспорт». */
export const EXPORT_HINT = 'Ctrl E'

/** Подпись кнопки выхода в хедере (видна только с действительной сессией). */
export const LOGOUT_LABEL = 'Выйти'

/** Ширина превью нового корневого блока из тулбара, px: карточка помещается в видимую область при 100%; страницу выбирают пресетом. */
export const NEW_ROOT_WIDTH = 480

/** Оценка высоты нового пустого корня, px (редакторский min-height листа): по ней блок центрируется по вертикали. */
export const NEW_ROOT_HEIGHT_ESTIMATE = 48

/** Экранное смещение нового корня, если в этой точке уже лежит другой корень, px. */
export const NEW_ROOT_OFFSET = 32

/** Сколько раз сдвигать новый корень, прежде чем сдаться (защита от бесконечного цикла). */
export const NEW_ROOT_MAX_SHIFTS = 200

/** `KeyboardEvent.code` клавиши F: создать flex-блок. */
export const CREATE_FLEX_CODE = 'KeyF'

/** `KeyboardEvent.code` клавиши G: создать grid-блок. */
export const CREATE_GRID_CODE = 'KeyG'

/** Ширина поля ввода подписи на канвасе, экранные px. */
export const LABEL_EDITOR_WIDTH = 160

/** Минимальная ширина поля ввода подписи, экранные px (в очень узком блоке поле всё равно читается). */
export const LABEL_EDITOR_MIN_WIDTH = 64

/** Высота поля ввода подписи, экранные px. Повторяет SCSS `$label-editor-height`. */
export const LABEL_EDITOR_HEIGHT = 24

/** Отступ поля ввода подписи от левого верхнего угла блока, экранные px. */
export const LABEL_EDITOR_INSET = 4

/** Подпись поля ввода подписи блока (для скринридера). */
export const LABEL_EDITOR_ARIA = 'Подпись блока'

/** Подсказка пустого поля ввода подписи: пусто значит автоподпись. */
export const LABEL_EDITOR_PLACEHOLDER = 'Блок-N'

/** Подпись группы действий над блоком в панели свойств. */
export const NODE_ACTIONS_LABEL = 'Действия'

/** Действия над блоком в панели свойств в порядке показа. */
export const NODE_ACTIONS = [
  { id: 'move-up', label: 'Выше', icon: 'arrow-up' },
  { id: 'move-down', label: 'Ниже', icon: 'arrow-down' },
  { id: 'duplicate', label: 'Дублировать', icon: null },
  { id: 'to-canvas', label: 'На канвас', icon: null },
  { id: 'extract', label: 'Вынести на канвас', icon: null },
  { id: 'delete', label: 'Удалить', icon: 'trash' },
] as const

/** Причины недоступности действий над блоком (всплывающая подсказка недоступной кнопки). */
export const NODE_ACTION_REASONS = {
  first: 'Уже первый среди соседей',
  last: 'Уже последний среди соседей',
  alreadyRoot: 'Блок уже лежит на канвасе',
  linkToCanvas: 'Связь — место внутри блока, на поле она стоять не может',
  missing: 'Ничего не выделено',
} as const

/** Сколько шагов истории хранится; более старые отбрасываются. */
export const HISTORY_LIMIT = 100

/** Окно склейки правок одного поля одного узла, мс: стрелки числового поля и сегменты подряд — один шаг истории. */
export const HISTORY_MERGE_MS = 500

/** Ключ склейки истории для правок правил документа (набор подряд — один шаг). */
export const RULES_MERGE_KEY = 'document:rules'

/** Пауза в наборе, после которой подпись и описание блока записываются в документ, мс (без ожидания blur). */
export const TEXT_DRAFT_COMMIT_MS = 300

/** Префикс ключа склейки истории сеанса набора в поле «Свойств» (записи одного сеанса — один шаг). */
export const TEXT_DRAFT_MERGE_PREFIX = 'text-draft:'

/** `KeyboardEvent.code` клавиши Z: Ctrl+Z отменяет, Ctrl+Shift+Z повторяет. */
export const UNDO_HOTKEY_CODE = 'KeyZ'

/** `KeyboardEvent.code` клавиши Y: Ctrl+Y повторяет. */
export const REDO_HOTKEY_CODE = 'KeyY'

/** Подпись и подсказка кнопки «Отменить». */
export const UNDO_LABEL = 'Отменить (Ctrl Z)'

/** Подпись и подсказка кнопки «Повторить». */
export const REDO_LABEL = 'Повторить (Ctrl Shift Z)'

/** `KeyboardEvent.code` клавиши Delete: удалить выделенное. */
export const DELETE_CODE = 'Delete'

/** `KeyboardEvent.code` клавиши Backspace: удалить выделенное. */
export const BACKSPACE_CODE = 'Backspace'

/** `KeyboardEvent.code` клавиши D (с Ctrl): дублировать. */
export const DUPLICATE_HOTKEY_CODE = 'KeyD'

/** `KeyboardEvent.code` клавиши C (с Ctrl): копировать блок. */
export const COPY_HOTKEY_CODE = 'KeyC'

/** `KeyboardEvent.code` клавиши V (с Ctrl): вставить блок. */
export const PASTE_HOTKEY_CODE = 'KeyV'

/** `KeyboardEvent.code` клавиши F2: переименовать выделенный блок. */
export const RENAME_HOTKEY_CODE = 'F2'

/** `KeyboardEvent.code` стрелки вверх (с Alt): выше среди соседей. */
export const ARROW_UP_CODE = 'ArrowUp'

/** `KeyboardEvent.code` стрелки вниз (с Alt): ниже среди соседей. */
export const ARROW_DOWN_CODE = 'ArrowDown'

/** Подпись кнопки тулбара со списком шаблонов-заготовок (она же подпись меню для скринридера). */
export const TEMPLATES_LABEL = 'Шаблоны'

/** Ширина превью корня шаблонов-страниц, px. */
export const TEMPLATE_ROOT_WIDTH = 960

/** Ширина превью корня шаблона «Сайдбар + контент», px. */
export const TEMPLATE_WIDE_ROOT_WIDTH = 1440

/** Число карточек в шаблоне «Ряд KPI». */
export const TEMPLATE_KPI_COUNT = 4

/** Число графиков в шаблоне «Сетка графиков 2×2». */
export const TEMPLATE_CHART_COUNT = 4

/** Высота графика в сетке, CSS. */
export const TEMPLATE_CHART_HEIGHT = '200px'

/** Число фильтров в шаблоне «Фильтры + таблица». */
export const TEMPLATE_FILTER_COUNT = 4

/** Высота таблицы, CSS. */
export const TEMPLATE_TABLE_HEIGHT = '320px'

/** Число пунктов меню в сайдбаре. */
export const TEMPLATE_MENU_ITEM_COUNT = 5

/** Колонки сетки графиков. */
export const TEMPLATE_CHARTS_COLUMNS = '1fr 1fr'

/** Колонки «Сайдбар + контент». */
export const TEMPLATE_SIDEBAR_COLUMNS = '250px 1fr'

/** Минимальная высота области контента, CSS. */
export const TEMPLATE_CONTENT_MIN_HEIGHT = '400px'

/** Значение `flex` у карточки KPI: ряд делится поровну. */
export const TEMPLATE_KPI_FLEX = '1'
