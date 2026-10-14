/** Логика компонента UiPanelSection: id тела (для aria-controls), переключение и классы шеврона. */
import { computed, useId, type ComputedRef, type Ref } from 'vue'

/** Возвращает id тела секции, переключатель раскрытия и классы шеврона по состоянию. */
export function useUiPanelSection(open: Ref<boolean>): {
  bodyId: string
  toggle: () => void
  chevronClasses: ComputedRef<(string | false)[]>
} {
  const bodyId = ['ui-panel-section', useId(), 'body'].join('-')
  const chevronClasses = computed(() => [
    'ui-panel-section__chevron',
    !open.value && 'ui-panel-section__chevron--collapsed',
  ])

  /** Раскрывает или сворачивает секцию. */
  function toggle(): void {
    open.value = !open.value
  }

  return { bodyId, toggle, chevronClasses }
}
