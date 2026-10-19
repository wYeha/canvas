/** Логика компонента UiIconButton: BEM-классы по размеру и нажатости. */
import { computed, type ComputedRef } from 'vue'
import type { UiIconButtonProps } from '@/scripts/components/ui-icon-button/ui-icon-button.types'

/** Возвращает классы кнопки: блок, модификатор размера и `--pressed` у нажатого переключателя. */
export function useUiIconButton(
  props: Required<Pick<UiIconButtonProps, 'size'>> & Pick<UiIconButtonProps, 'pressed'>,
): {
  classes: ComputedRef<string[]>
} {
  const classes = computed(() => [
    'ui-icon-button',
    `ui-icon-button--size-${props.size}`,
    ...(props.pressed === true ? ['ui-icon-button--pressed'] : []),
  ])
  return { classes }
}
