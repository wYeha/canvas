/** Помощники ARIA для общих компонентов: единые правила подписи контролов. */

/** Атрибуты контрола, переданные снаружи (id, aria-*). */
export type AriaAttrs = Record<string, string | number | undefined>

/** Возвращает aria-label из подписи или undefined, если имя уже задано через aria-labelledby (оба атрибута не ставим). */
export function ariaLabelUnlessLabelledBy(label: string, attrs: AriaAttrs | undefined): string | undefined {
  const labelledBy = attrs?.['aria-labelledby']
  return labelledBy === undefined || labelledBy === '' ? label : undefined
}
