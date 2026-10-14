/** Логика компонента UiIcon: пути SVG по имени иконки. */
import { computed, type ComputedRef } from 'vue'
import { ICON_PATHS } from '@/scripts/components/ui-icon/ui-icon.constants'
import type { UiIconProps } from '@/scripts/components/ui-icon/ui-icon.types'

/** Возвращает реактивный список путей SVG для выбранной иконки. */
export function useUiIcon(props: UiIconProps): { paths: ComputedRef<readonly string[]> } {
  const paths = computed(() => ICON_PATHS[props.name])
  return { paths }
}
