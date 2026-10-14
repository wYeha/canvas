/** Логика компонента UiTextInput: BEM-классы по состояниям. */
import { computed, type ComputedRef } from 'vue'
import { ariaLabelUnlessLabelledBy } from '@/scripts/globals/aria'
import type { UiTextInputProps } from '@/scripts/components/ui-text-input/ui-text-input.types'

/** Возвращает классы рамки поля: блок и модификаторы ошибки, недоступности и моноширинного шрифта. */
export function useUiTextInput(props: Pick<UiTextInputProps, 'error' | 'disabled' | 'mono' | 'label' | 'inputAttrs'>): {
  classes: ComputedRef<(string | false | undefined)[]>
  ariaLabel: ComputedRef<string | undefined>
} {
  const classes = computed(() => [
    'ui-text-input',
    props.error && 'ui-text-input--error',
    props.disabled && 'ui-text-input--disabled',
    props.mono && 'ui-text-input--mono',
  ])
  const ariaLabel = computed(() => ariaLabelUnlessLabelledBy(props.label, props.inputAttrs))
  return { classes, ariaLabel }
}
