/** Чистая логика секции «Как ребёнок»: подсказка в заголовке, нормализация размеров, правка `self` без мутации. Без Vue. */
import { parseCssValue, type Container, type SelfProps } from '@shared'
import { isDefaultFlex } from './node-style'
import type { UiChipOption } from '@/scripts/components/ui-chips/ui-chips.types'
import {
  CHILD_AUTO_VALUE,
  CHILD_FLEX_QUICK_VALUES,
  CHILD_HINT_ARROWS,
  CHILD_HINT_PREFIX,
  CHILD_HINT_TIMES,
  CHILD_SPAN_MIN,
  CSS_DEFAULT_FLEX,
  CSS_PX_UNIT,
} from './constants'

/** Ключи `self`, которые правятся текстом. */
export type SelfTextKey = 'flex' | 'width' | 'height' | 'minHeight'

/** Ключи `self`, которые правятся числом (span в grid). */
export type SelfSpanKey = 'colSpan' | 'rowSpan'

/** Чистое число без единицы: `120`, `12.5`. */
const BARE_NUMBER = /^\d+(\.\d+)?$/

/** Быстрые значения `flex`: чип со значением по умолчанию `0 1 auto` и `1 / auto / none`. */
export const CHILD_FLEX_OPTIONS: readonly UiChipOption[] = [
  { value: CSS_DEFAULT_FLEX, label: CSS_DEFAULT_FLEX },
  ...CHILD_FLEX_QUICK_VALUES.map((value) => ({ value, label: value })),
]

/** Разбивает значение на токены верхнего уровня (пробелы внутри скобок не делят). */
function topLevelTokens(value: string): string[] {
  const tokens: string[] = []
  let depth = 0
  let current = ''
  for (const char of value.trim()) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (/\s/.test(char) && depth === 0) {
      if (current !== '') tokens.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current !== '') tokens.push(current)
  return tokens
}

/** Число колонок в `repeat(N, …)`; `auto-fill` / `auto-fit` и разбор-неудача дают `null`. */
function repeatColumns(token: string): number | null {
  const match = /^repeat\(\s*(\d+)\s*,([\s\S]+)\)$/i.exec(token)
  if (match === null) return null
  const inner = countGridColumns(match[2] ?? '')
  return inner === null ? null : Number(match[1]) * inner
}

/** Число колонок шаблона `grid-template-columns`; `null`, если оно зависит от ширины (`auto-fill`) или не разобрано. */
export function countGridColumns(template: string): number | null {
  let total = 0
  for (const token of topLevelTokens(template)) {
    if (token.startsWith('[')) continue
    const count = token.toLowerCase().startsWith('repeat(') ? repeatColumns(token) : 1
    if (count === null) return null
    total += count
  }
  return total > 0 ? total : null
}

/** Подсказка секции: `в flex →` (стрелка по направлению) или `в grid ×N` (N неизвестно — просто `в grid`). */
export function childHint(parent: Container): string {
  if (parent.kind === 'flex') return `${CHILD_HINT_PREFIX} flex ${CHILD_HINT_ARROWS[parent.direction]}`
  const columns = countGridColumns(parent.columns)
  const base = `${CHILD_HINT_PREFIX} grid`
  return columns === null ? base : `${base} ${CHILD_HINT_TIMES}${String(columns)}`
}

/** Нормализует `flex`: пробелы схлопываются, пусто означает значение по умолчанию `0 1 auto`, небезопасное — `null`. */
export function normalizeChildFlex(value: string): string | null {
  const parsed = parseCssValue(value, true)
  return parsed === '' ? CSS_DEFAULT_FLEX : parsed
}

/** Значение `flex` для показа в поле и чипах: пустое или отсутствующее (старые документы) — `0 1 auto`. */
export function displayChildFlex(value: string | undefined): string {
  return isDefaultFlex(value) ? CSS_DEFAULT_FLEX : (value ?? '').trim()
}

/** Нормализует размер: пусто и `auto` — нет значения; чистое число — `Npx`; небезопасное — `null`. */
export function normalizeChildSize(value: string): string | null {
  const parsed = parseCssValue(value, true)
  if (parsed === null) return null
  if (parsed.toLowerCase() === CHILD_AUTO_VALUE) return ''
  return BARE_NUMBER.test(parsed) ? `${parsed}${CSS_PX_UNIT}` : parsed
}

/** Копия `self` без ключа. */
function omitKey(self: SelfProps, key: keyof SelfProps): SelfProps {
  return Object.fromEntries(Object.entries(self).filter(([name]) => name !== key))
}

/** Возвращает `self` с новым текстовым значением; пустое значение удаляет ключ. Вход не мутируется. */
export function withSelfText(self: SelfProps, key: SelfTextKey, value: string): SelfProps {
  const rest = omitKey(self, key)
  return value === '' ? rest : { ...rest, [key]: value }
}

/** Возвращает `self` с новым span; `null`, 1 и меньше (и нецелое → вниз) удаляют ключ. Вход не мутируется. */
export function withSelfSpan(self: SelfProps, key: SelfSpanKey, value: number | null): SelfProps {
  const rest = omitKey(self, key)
  const span = value === null ? null : Math.trunc(value)
  return span === null || span <= CHILD_SPAN_MIN ? rest : { ...rest, [key]: span }
}
