/**
 * Composable вставки шаблонов-заготовок из тулбара: в выделенный блок последним ребёнком, без выделения —
 * новым корнем в центре видимой области. Идёт через те же экшены стора, что и вставка из буфера (один шаг истории).
 */
import type { UiDropdownItem } from '@/scripts/components/ui-dropdown/ui-dropdown.types'
import { newBlockParentId } from './block-create'
import { BLOCK_TEMPLATES, findBlockTemplate } from './block-templates'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { useCanvasCreate } from './use-canvas-create'

/** Пункты меню шаблонов: значение — id шаблона. */
export const TEMPLATE_MENU_ITEMS: readonly UiDropdownItem[] = BLOCK_TEMPLATES.map((template) => ({
  value: template.id,
  label: template.label,
}))

/** Возвращает `insertTemplate(id)` и пункты меню `items`. */
export function useCanvasTemplates() {
  const layoutStore = useLayoutStore()
  const labelEdit = useLabelEditStore()
  const { newRootPoint } = useCanvasCreate()

  /** Вставляет шаблон `id` (новые id блоков), выделяет вставленный блок; ввод подписи не открывает. */
  function insertTemplate(id: string): boolean {
    const template = findBlockTemplate(id)
    if (template === undefined) return false
    labelEdit.finish()
    const node = template.build()
    const parentId = newBlockParentId(layoutStore.document, layoutStore.selectedNode)
    if (parentId !== null) return layoutStore.pasteChild(parentId, node) !== null
    return layoutStore.pasteRoot(node, newRootPoint(), template.rootWidth) !== null
  }

  return { items: TEMPLATE_MENU_ITEMS, insertTemplate }
}
