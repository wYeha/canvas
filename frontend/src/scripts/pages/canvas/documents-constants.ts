/** Константы документов страницы canvas: автосохранение, тексты статуса и меты, подписи меню документов. */

/** Задержка автосохранения после последнего изменения документа, мс. */
export const AUTOSAVE_DELAY_MS = 500

/** Максимальная длина названия документа. */
export const DOCUMENT_NAME_MAX_LENGTH = 80

/** Подписи статуса сохранения в хедере. */
export const SAVE_STATUS_LABELS = {
  saved: 'Сохранено',
  saving: 'Сохраняется…',
  error: 'Не удалось сохранить',
  demo: 'Демо, не сохраняется',
} as const

/** Единицы времени, мс. */
export const MS_PER_MINUTE = 60_000
export const MS_PER_HOUR = 3_600_000

/** Мета документа: подписи времени изменения. */
export const UPDATED_JUST_NOW = 'только что'
export const UPDATED_YESTERDAY = 'вчера'
export const UPDATED_PREFIX = 'изменён'
export const UPDATED_MINUTES_SUFFIX = 'мин назад'
export const UPDATED_HOURS_SUFFIX = 'ч назад'

/** Разделитель частей меты документа. */
export const META_SEPARATOR = ' · '

/** Сокращённые названия месяцев для даты «8 окт». */
export const MONTH_SHORT_NAMES = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
] as const

/** Склонения «корневой» для числа корней: один, несколько (2–4), много. */
export const ROOTS_WORD_FORMS = { one: 'корневой', few: 'корневых', many: 'корневых' } as const

/** Причина недоступности пунктов работы с файлами до 5.5. */
export const FILES_UNAVAILABLE_TITLE = 'Появится в 5.5'

/** Подписи меню документов. */
export const DOCS_MENU_LABEL = 'Документы'
export const DOCS_MENU_NEW_LABEL = 'Новый документ'
export const DOCS_MENU_OPEN_FILE_LABEL = 'Открыть .json…'
export const DOCS_MENU_SAVE_FILE_LABEL = 'Сохранить в .json'
export const DOCS_MENU_RENAME_LABEL = 'Переименовать'
export const DOCS_MENU_DELETE_LABEL = 'Удалить'
export const DOCS_MENU_CANCEL_LABEL = 'Отмена'
export const DOCS_MENU_NAME_FIELD_LABEL = 'Название документа'
export const DOCS_MENU_DEMO_TITLE = 'В демо-режиме документы недоступны'

/** Значения (value) пунктов-действий внизу меню; id документов — UUID, с ними не пересекаются. */
export const DOCS_ACTION_NEW = 'action:new'
export const DOCS_ACTION_OPEN_FILE = 'action:open-file'
export const DOCS_ACTION_SAVE_FILE = 'action:save-file'

/** `KeyboardEvent.key` для переименования и удаления документа с клавиатуры. */
export const RENAME_KEY = 'F2'
export const DELETE_KEY = 'Delete'

/** Подсказка клавиш строки документа для скринридера (aria-keyshortcuts): переименовать и удалить. */
export const DOC_ROW_KEYSHORTCUTS = 'F2 Delete'
