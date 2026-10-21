/** Константы окна экспорта: подписи охвата и кнопок, тексты пустых состояний и ошибок, время показа «Скопировано». */
import type { UiSegmentedOption } from '@/scripts/components/ui-segmented/ui-segmented.types'
import type { ExportScopeKind } from './export-modal.types'

/** Заголовок окна. */
export const EXPORT_MODAL_TITLE = 'Экспорт'

/** Сколько миллисекунд кнопка «Копировать» остаётся зелёной «Скопировано». */
export const EXPORT_COPIED_MS = 2000

/** Подпись поля охвата (и группы для скринридера). */
export const EXPORT_SCOPE_LABEL = 'Охват'

/** Подписи сегментов охвата (полные названия — в пояснениях `EXPORT_SCOPE_HINTS`). */
export const EXPORT_SCOPE_LABELS: Readonly<Record<ExportScopeKind, string>> = {
  selected: 'Выделенный',
  checked: 'Отмеченные',
  all: 'Все',
}

/** Пояснение под сегментами: что попадёт в код при выбранном охвате. */
export const EXPORT_SCOPE_HINTS: Readonly<Record<ExportScopeKind, string>> = {
  selected: 'Выделенный блок со всем содержимым',
  checked: 'Отмеченные корневые блоки',
  all: 'Все корневые блоки документа; подключённые связями — на местах связей, отдельно не повторяются',
}

/** Порядок сегментов охвата. */
export const EXPORT_SCOPE_ORDER: readonly ExportScopeKind[] = ['selected', 'checked', 'all']

/** Заголовок списка корневых блоков. */
export const EXPORT_ROOTS_LABEL = 'Корневые блоки'

/** Id заголовка списка корней: на него ссылается `aria-labelledby` списка. */
export const EXPORT_ROOTS_LABEL_ID = 'export-modal-roots-label'

/** Текст вместо списка, когда в документе нет корневых блоков. */
export const EXPORT_ROOTS_EMPTY = 'В документе нет корневых блоков'

/** Подпись поля шаблона промпта. */
export const EXPORT_PROMPT_LABEL = 'Шаблон промпта'

/** Подсказка под шаблоном промпта. */
export const EXPORT_PROMPT_HINT = 'Общий для всех документов, идёт в код первым комментарием'

/** Ошибка сохранения шаблона в браузере. */
export const EXPORT_PROMPT_SAVE_FAILED = 'Не удалось сохранить шаблон в браузере'

/** Число видимых строк поля шаблона промпта. */
export const EXPORT_PROMPT_ROWS = 6

/** Кнопка сброса шаблона. */
export const EXPORT_PROMPT_RESET = 'Сбросить'

/** Подпись поля правил документа. */
export const EXPORT_RULES_LABEL = 'Правила документа'

/** Подсказка поля правил документа. */
export const EXPORT_RULES_HINT = 'Только для этого документа: общие правила вёрстки, идут в промпт после шаблона'

/** Пример в пустом поле правил документа. */
export const EXPORT_RULES_PLACEHOLDER = 'Например: отступы только через gap, без margin у детей'

/** Высота поля правил документа в строках. */
export const EXPORT_RULES_ROWS = 3

/** Кнопка копирования. */
export const EXPORT_COPY_LABEL = 'Копировать'

/** Кнопка копирования после успеха. */
export const EXPORT_COPIED_LABEL = 'Скопировано'

/** Кнопка скачивания. */
export const EXPORT_DOWNLOAD_LABEL = 'Скачать .html'

/** Сообщение, когда копирование не удалось. */
export const EXPORT_COPY_FAILED = 'Не удалось скопировать — выделите код вручную'

/** Сообщение, когда скачивание не удалось. */
export const EXPORT_DOWNLOAD_FAILED = 'Не удалось скачать файл'

/** Пустое состояние предпросмотра: ни один корень не отмечен. */
export const EXPORT_EMPTY_NOTHING_CHECKED = 'Отметьте хотя бы один корневой блок'

/** Пустое состояние предпросмотра: в документе нет блоков. */
export const EXPORT_EMPTY_DOCUMENT = 'Документ пуст'

/** Подпись области предпросмотра кода для скринридера. */
export const EXPORT_PREVIEW_LABEL = 'Предпросмотр кода'

/** Разделитель частей строки меты предпросмотра. */
export const EXPORT_META_SEPARATOR = ' · '

/** Склонения слова «строка» для меты: 1 строка, 2 строки, 5 строк. */
export const EXPORT_LINES_WORDS = { one: 'строка', few: 'строки', many: 'строк', other: 'строки' } as const

/** Варианты сегментов охвата без учёта недоступности (она зависит от выделения). */
export const EXPORT_SCOPE_OPTIONS: readonly UiSegmentedOption[] = EXPORT_SCOPE_ORDER.map((kind) => ({
  value: kind,
  label: EXPORT_SCOPE_LABELS[kind],
}))
