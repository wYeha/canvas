/**
 * Чистая логика истории undo/redo на снимках: запись шага, отмена, повтор, лимит и склейка частых правок
 * по ключу и времени. Без Vue и Pinia; время передаётся аргументом, поэтому логика тестируется без таймеров.
 */

/** Состояние истории: снимки «до» шагов (`past`, последний — ближайший), снимки для повтора и метка последней записи. */
export interface HistoryState<T> {
  readonly past: readonly T[]
  readonly future: readonly T[]
  /** Ключ склейки последнего шага; `null` — следующий шаг не склеивается. */
  readonly lastKey: string | null
  /** Время последней записи (или склейки), мс. */
  readonly lastAt: number
}

/** Параметры записи шага. */
export interface RecordOptions {
  /** Ключ склейки: шаг с тем же ключом в пределах окна склеивается с предыдущим; `null` — не склеивать. */
  key: string | null
  /** Текущее время, мс. */
  now: number
  /** Окно склейки, мс: пауза между правками, после которой начинается новый шаг. */
  mergeWindow: number
  /** Сколько шагов хранить; самые старые отбрасываются. */
  limit: number
}

/** Результат отмены или повтора: новое состояние истории и снимок, который нужно применить. */
export interface HistoryMove<T> {
  history: HistoryState<T>
  snapshot: T
}

/** Пустая история. */
export function emptyHistory<T>(): HistoryState<T> {
  return { past: [], future: [], lastKey: null, lastAt: 0 }
}

/** Склеивается ли новый шаг с последним: тот же ключ и пауза не больше окна. */
function shouldMerge<T>(history: HistoryState<T>, options: RecordOptions): boolean {
  return (
    options.key !== null &&
    history.past.length > 0 &&
    history.lastKey === options.key &&
    options.now - history.lastAt <= options.mergeWindow
  )
}

/**
 * Записывает шаг: `before` — снимок до изменения. При склейке снимок не добавляется (отмена вернёт к началу серии),
 * а окно сдвигается от текущей правки. Любая запись очищает повтор.
 */
export function recordStep<T>(history: HistoryState<T>, before: T, options: RecordOptions): HistoryState<T> {
  if (shouldMerge(history, options)) return { ...history, future: [], lastAt: options.now }
  const past = [...history.past, before]
  return {
    past: past.length > options.limit ? past.slice(past.length - options.limit) : past,
    future: [],
    lastKey: options.key,
    lastAt: options.now,
  }
}

/** Отменяет последний шаг: `current` уходит в повтор; `null`, если отменять нечего. */
export function undoStep<T>(history: HistoryState<T>, current: T): HistoryMove<T> | null {
  const snapshot = history.past.at(-1)
  if (snapshot === undefined) return null
  return {
    snapshot,
    // После отмены следующая правка начинает новый шаг, даже с тем же ключом
    history: { past: history.past.slice(0, -1), future: [...history.future, current], lastKey: null, lastAt: 0 },
  }
}

/** Повторяет отменённый шаг: `current` возвращается в прошлое; `null`, если повторять нечего. */
export function redoStep<T>(history: HistoryState<T>, current: T): HistoryMove<T> | null {
  const snapshot = history.future.at(-1)
  if (snapshot === undefined) return null
  return {
    snapshot,
    history: { past: [...history.past, current], future: history.future.slice(0, -1), lastKey: null, lastAt: 0 },
  }
}

/** Объект без массивов и `null`: в него спускаемся при сравнении полей. */
function isPlainObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Ключи, значения которых различаются по ссылке (объединение ключей обеих сторон). */
function differentKeys(before: Map<string, unknown>, after: Map<string, unknown>): string[] {
  const keys = new Set([...before.keys(), ...after.keys()])
  return [...keys].filter((key) => before.get(key) !== after.get(key))
}

/**
 * Изменённые поля объекта на двух уровнях (`label`, `container.gap`, `padding.top`): по ним строится ключ склейки,
 * чтобы подряд склеивались правки одного поля, а не любые правки узла. Глубже второго уровня не спускаемся.
 */
export function changedFields(before: object, after: object): string[] {
  const a = new Map(Object.entries(before))
  const b = new Map(Object.entries(after))
  return differentKeys(a, b)
    .flatMap((key) => {
      const left = a.get(key)
      const right = b.get(key)
      if (!isPlainObject(left) || !isPlainObject(right)) return [key]
      const nested = differentKeys(new Map(Object.entries(left)), new Map(Object.entries(right)))
      // Новый объект с теми же значениями всё равно считается правкой поля целиком
      return nested.length === 0 ? [key] : nested.map((sub) => `${key}.${sub}`)
    })
    .sort()
}
