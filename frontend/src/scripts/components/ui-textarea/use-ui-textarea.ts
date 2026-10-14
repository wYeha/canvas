/** Логика компонента UiTextarea: BEM-классы по состояниям и aria-label. */
import { computed, type ComputedRef } from 'vue'
import { ariaLabelUnlessLabelledBy } from '@/scripts/globals/aria'
import type { UiTextareaProps } from '@/scripts/components/ui-textarea/ui-textarea.types'

/** Возвращает классы поля (блок и модификаторы ошибки и недоступности) и aria-label. */
export function useUiTextarea(props: Pick<UiTextareaProps, 'error' | 'disabled' | 'label' | 'inputAttrs'>): {
  classes: ComputedRef<(string | false | undefined)[]>
  ariaLabel: ComputedRef<string | undefined>
} {
  const classes = computed(() => [
    'ui-textarea',
    props.error && 'ui-textarea--error',
    props.disabled && 'ui-textarea--disabled',
  ])
  const ariaLabel = computed(() => ariaLabelUnlessLabelledBy(props.label, props.inputAttrs))
  return { classes, ariaLabel }
}
