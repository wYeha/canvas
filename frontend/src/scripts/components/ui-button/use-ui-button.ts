/** Логика компонента UiButton: BEM-классы по виду и размеру. */
import { computed, type ComputedRef } from 'vue'
import type { UiButtonProps } from '@/scripts/components/ui-button/ui-button.types'

/** Возвращает классы кнопки: блок, модификаторы вида и размера. */
export function useUiButton(props: Required<Pick<UiButtonProps, 'variant' | 'size'>>): {
  classes: ComputedRef<string[]>
} {
  const classes = computed(() => ['ui-button', `ui-button--variant-${props.variant}`, `ui-button--size-${props.size}`])
  return { classes }
}
