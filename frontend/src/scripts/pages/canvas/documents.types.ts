/** Типы документов страницы canvas: запись индекса, статус сохранения и строки меню документов. */

/** Запись индекса документов: всё, что нужно для списка, без загрузки самого документа. */
export interface DocumentMeta {
  id: string
  name: string
  updatedAt: string
  rootCount: number
}

/** Статус сохранения в хедере: сохранён, идёт (ждёт) сохранение, ошибка записи, демо (не сохраняется). */
export type SaveStatus = 'saved' | 'saving' | 'error' | 'demo'

/** Строка меню: документ (с метой и признаком текущего) или действие внизу списка. */
export interface DocsMenuItem {
  value: string
  label: string
  kind: 'doc' | 'action'
  disabled?: boolean
  /** Пояснение недоступного пункта (title). */
  title?: string
  /** Мета документа: «изменён вчера · 5 корневых». */
  meta?: string
  /** Документ открыт сейчас (галочка). */
  current?: boolean
}
