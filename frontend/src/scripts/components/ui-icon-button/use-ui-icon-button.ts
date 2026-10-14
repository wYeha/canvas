/** Логика компонента UiIconButton: BEM-классы по размеру. */
import { computed, type ComputedRef } from 'vue'
import type { UiIconButtonProps } from '@/scripts/components/ui-icon-button/ui-icon-button.types'

/** Возвращает классы кнопки: блок и модификатор размера. */
export function useUiIconButton(props: Required<Pick<UiIconButtonProps, 'size'>>): {
  classes: ComputedRef<string[]>
} {
  const classes = computed(() => ['ui-icon-button', `ui-icon-button--size-${props.size}`])
  return { classes }
}
