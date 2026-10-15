/**
 * Логика меню документов в хедере: строки (документы и действия), всплывающий список поверх общих popup-утилит,
 * переименование и подтверждение удаления прямо в строке, клавиатура (F2, Delete, Esc, Enter).
 */
import { computed, nextTick, ref, useId, watch, type ComputedRef, type Ref } from 'vue'
import type { UiDropdownTriggerAttrs } from '@/scripts/components/ui-dropdown/ui-dropdown.types'
import { firstEnabledIndex } from '@/scripts/globals/list-nav'
import { usePopupList, type PopupList } from '@/scripts/globals/use-popup-list'
import {
  DELETE_KEY,
  DOCS_ACTION_NEW,
  DOCS_ACTION_OPEN_FILE,
  DOCS_ACTION_SAVE_FILE,
  DOCS_MENU_NEW_LABEL,
  DOCS_MENU_OPEN_FILE_LABEL,
  DOCS_MENU_SAVE_FILE_LABEL,
  RENAME_KEY,
} from './documents-constants'
import { formatDocumentMeta } from './documents-index'
import { useDocumentsStore } from './documents-store'
import type { DocsMenuItem } from './documents.types'
import { useCanvasDocsFiles, type CanvasDocsFiles } from './use-canvas-docs-files'
import { useLayoutStore } from './layout-store'

/** Режим редактируемой строки: переименование (поле ввода) или подтверждение удаления. */
interface EditingRow {
  id: string
  mode: 'rename' | 'delete'
}

/** Состояние меню документов для шаблона. */
export interface CanvasDocsMenuState
  extends Omit<PopupList, 'anchor' | 'onListKeydown'>, Pick<CanvasDocsFiles, 'fileInput' | 'onFileChange'> {
  trigger: PopupList['anchor']
  menuId: string
  items: ComputedRef<DocsMenuItem[]>
  docName: ComputedRef<string>
  isDemo: ComputedRef<boolean>
  editing: Ref<EditingRow | null>
  draft: Ref<string>
  activeId: ComputedRef<string | undefined>
  triggerAttrs: ComputedRef<UiDropdownTriggerAttrs>
  itemId: (index: number) => string
  itemClasses: (item: DocsMenuItem, index: number) => (string | false)[]
  choose: (index: number) => void
  beginRename: (id: string) => void
  beginDelete: (id: string) => void
  cancelEdit: () => void
  confirmDelete: () => void
  onListKeydown: (event: KeyboardEvent) => void
}

/** Действия внизу меню: новый документ, открыть и сохранить .json. */
function actionItems(): DocsMenuItem[] {
  return [
    { value: DOCS_ACTION_NEW, label: DOCS_MENU_NEW_LABEL, kind: 'action' },
    { value: DOCS_ACTION_OPEN_FILE, label: DOCS_MENU_OPEN_FILE_LABEL, kind: 'action' },
    { value: DOCS_ACTION_SAVE_FILE, label: DOCS_MENU_SAVE_FILE_LABEL, kind: 'action' },
  ]
}

/** Возвращает состояние и обработчики меню документов; ссылки root, trigger и list привязываются в шаблоне по имени. */
export function useCanvasDocsMenu(): CanvasDocsMenuState {
  const documents = useDocumentsStore()
  const layout = useLayoutStore()
  const files = useCanvasDocsFiles()
  const menuId = ['canvas-docs-menu', useId()].join('-')
  const editing = ref<EditingRow | null>(null)
  const draft = ref('')
  /** Момент открытия меню: от него считается «N мин назад» (время в чистые функции передаётся аргументом). */
  const now = ref(new Date())

  const items = computed<DocsMenuItem[]>(() => [
    ...documents.entries.map<DocsMenuItem>((meta) => ({
      value: meta.id,
      label: meta.name,
      kind: 'doc',
      meta: formatDocumentMeta(meta, now.value),
      current: meta.id === documents.currentId,
    })),
    ...actionItems(),
  ])
  const docName = computed(() => layout.document.name)
  const isDemo = computed(() => documents.isDemo)

  /** Индекс строки документа по id; -1, если такой нет. */
  function indexOfDoc(id: string): number {
    return items.value.findIndex((item) => item.kind === 'doc' && item.value === id)
  }

  /** Выполняет пункт: документ — переключиться, действие — по значению; `true`, если меню нужно закрыть. */
  function runItem(item: DocsMenuItem): boolean {
    if (item.kind === 'doc') return documents.switchTo(item.value)
    if (item.value === DOCS_ACTION_OPEN_FILE) files.pickFile()
    else if (item.value === DOCS_ACTION_SAVE_FILE) files.saveFile()
    else return documents.create()
    return true
  }

  /** Выбирает пункт меню; в режиме правки строки игнорируется. */
  function choose(index: number): void {
    const item = items.value[index]
    if (!item || item.disabled || editing.value !== null) return
    if (runItem(item)) popup.close(true)
  }

  const popup = usePopupList({
    /** Пункты меню. */
    items: () => items.value,
    /** В демо документов нет: меню не открывается. */
    disabled: () => documents.isDemo,
    /** Открытие ставит активным текущий документ, иначе первый доступный пункт. */
    initialIndex: () => {
      const current = documents.currentId === null ? -1 : indexOfDoc(documents.currentId)
      return current >= 0 ? current : firstEnabledIndex(items.value)
    },
    choose,
    matchWidth: false,
    wrap: true,
  })

  /** Возвращает фокус на список, чтобы клавиатура продолжала работать после правки строки. */
  function refocusList(): void {
    void nextTick(() => popup.list.value?.focus())
  }

  /** Фокусирует поле или кнопку внутри строки документа `id` (после её перерисовки). */
  function focusInRow(id: string, selector: string): void {
    void nextTick(() => {
      const row = popup.list.value?.children[indexOfDoc(id)]
      const target = row?.querySelector<HTMLInputElement | HTMLButtonElement>(selector)
      target?.focus()
      if (target instanceof HTMLInputElement) target.select()
    })
  }

  /** Включает переименование в строке: поле с текущим названием, выделенным целиком. */
  function beginRename(id: string): void {
    const item = items.value[indexOfDoc(id)]
    if (!item) return
    draft.value = item.label
    editing.value = { id, mode: 'rename' }
    focusInRow(id, 'input')
  }

  /** Включает подтверждение удаления в строке; фокус на «Отмена», чтобы случайный Enter ничего не удалил. */
  function beginDelete(id: string): void {
    editing.value = { id, mode: 'delete' }
    focusInRow(id, 'button')
  }

  /** Применяет переименование; пустое имя — откат (стор отказывает, строка возвращается к прежнему названию). */
  function commitRename(): void {
    const row = editing.value
    if (row?.mode !== 'rename') return
    editing.value = null
    documents.rename(row.id, draft.value)
  }

  /** Отменяет правку строки (Esc, «Отмена») без изменений. */
  function cancelEdit(): void {
    editing.value = null
    refocusList()
  }

  /** Подтверждает удаление; активная строка не уходит за конец списка. */
  function confirmDelete(): void {
    const row = editing.value
    if (row?.mode !== 'delete') return
    editing.value = null
    documents.remove(row.id)
    popup.setActive(Math.min(popup.activeIndex.value, items.value.length - 1))
    refocusList()
  }

  // Sync: при клике мимо закрытие происходит раньше blur поля, поэтому незавершённое переименование применяем здесь
  watch(
    popup.isOpen,
    (open) => {
      if (open) {
        now.value = new Date()
        return
      }
      commitRename()
      editing.value = null
    },
    { flush: 'sync' },
  )

  /** Клавиатура строки в правке: Esc — отмена, Enter — применить переименование; остальное достаётся полю или кнопкам. */
  function onEditKeydown(event: KeyboardEvent, row: EditingRow): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEdit()
    } else if (event.key === 'Enter' && row.mode === 'rename') {
      event.preventDefault()
      commitRename()
      refocusList()
    }
  }

  /** Клавиатура списка: F2 и Delete работают с активным документом, остальное — общая навигация меню. */
  function onListKeydown(event: KeyboardEvent): void {
    // Клавиши меню не должны доходить до хоткеев канваса (Delete удалил бы выделенный блок)
    event.stopPropagation()
    if (editing.value !== null) {
      onEditKeydown(event, editing.value)
      return
    }
    const item = items.value[popup.activeIndex.value]
    if (item?.kind === 'doc' && (event.key === RENAME_KEY || event.key === DELETE_KEY)) {
      event.preventDefault()
      if (event.key === RENAME_KEY) beginRename(item.value)
      else beginDelete(item.value)
      return
    }
    popup.onListKeydown(event)
  }

  /** Возвращает id строки для aria-activedescendant. */
  function itemId(index: number): string {
    return `${menuId}-item-${String(index)}`
  }

  /** BEM-классы строки: активная, правка, действие, недоступная; первое действие отделено линией. */
  function itemClasses(item: DocsMenuItem, index: number): (string | false)[] {
    const isFirstAction = item.kind === 'action' && items.value[index - 1]?.kind === 'doc'
    return [
      'canvas-docs-menu__item',
      index === popup.activeIndex.value && 'canvas-docs-menu__item--active',
      item.kind === 'doc' && 'canvas-docs-menu__item--doc',
      item.kind === 'action' && 'canvas-docs-menu__item--action',
      isFirstAction && 'canvas-docs-menu__item--first-action',
      item.disabled === true && 'canvas-docs-menu__item--disabled',
      editing.value?.id === item.value && 'canvas-docs-menu__item--editing',
    ]
  }

  const activeId = computed(() => (popup.activeIndex.value >= 0 ? itemId(popup.activeIndex.value) : undefined))
  const triggerAttrs = computed<UiDropdownTriggerAttrs>(() => ({
    'aria-haspopup': 'menu',
    'aria-expanded': popup.isOpen.value,
    'aria-controls': popup.isOpen.value ? menuId : undefined,
  }))

  const { anchor: trigger, ...rest } = popup
  return {
    ...rest,
    trigger,
    menuId,
    items,
    docName,
    isDemo,
    editing,
    draft,
    activeId,
    triggerAttrs,
    itemId,
    itemClasses,
    choose,
    beginRename,
    beginDelete,
    cancelEdit,
    confirmDelete,
    onListKeydown,
    fileInput: files.fileInput,
    onFileChange: files.onFileChange,
  }
}
