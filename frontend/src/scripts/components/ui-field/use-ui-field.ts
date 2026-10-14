/** Логика компонента UiField: id подписи, контрола и сообщений, связь через aria-describedby. */
import { computed, useId, type ComputedRef } from 'vue'
import type { UiFieldProps, UiFieldSlotProps } from '@/scripts/components/ui-field/ui-field.types'

/** Выбирает id описания: ошибка важнее подсказки; undefined, если ни того ни другого нет. */
export function pickDescribedBy(
  hasError: boolean,
  hasHint: boolean,
  errorId: string,
  hintId: string,
): string | undefined {
  if (hasError) return errorId
  return hasHint ? hintId : undefined
}

/** Возвращает id элементов поля и данные для слота (id контрола, aria-describedby, признак ошибки). */
export function useUiField(props: Readonly<UiFieldProps>): {
  ids: { control: string; label: string; hint: string; error: string }
  slotProps: ComputedRef<UiFieldSlotProps>
} {
  const base = ['ui-field', useId()].join('-')
  const ids = { control: `${base}-control`, label: `${base}-label`, hint: `${base}-hint`, error: `${base}-error` }
  const slotProps = computed<UiFieldSlotProps>(() => ({
    id: ids.control,
    labelId: ids.label,
    describedBy: pickDescribedBy(Boolean(props.error), Boolean(props.hint), ids.error, ids.hint),
    invalid: Boolean(props.error),
  }))
  return { ids, slotProps }
}
