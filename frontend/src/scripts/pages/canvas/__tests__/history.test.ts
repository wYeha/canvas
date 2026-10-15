/** Тесты чистой логики истории: запись, отмена, повтор, лимит, склейка по ключу и времени, изменённые поля. */
import { describe, expect, it } from 'vitest'
import {
  changedFields,
  emptyHistory,
  recordStep,
  redoStep,
  undoStep,
  type HistoryState,
  type RecordOptions,
} from '@/scripts/pages/canvas/history'

const WINDOW = 500
const LIMIT = 100

/** Параметры записи с разумными значениями по умолчанию. */
function opts(patch: Partial<RecordOptions> = {}): RecordOptions {
  return { key: null, now: 0, mergeWindow: WINDOW, limit: LIMIT, ...patch }
}

/** Записывает подряд шаги с состояниями «до» из списка, без склейки. */
function recordAll(states: string[], limit = LIMIT): HistoryState<string> {
  return states.reduce((h, s) => recordStep(h, s, opts({ limit })), emptyHistory<string>())
}

describe('recordStep / undoStep / redoStep', () => {
  it('пустая история: отменять и повторять нечего', () => {
    expect(undoStep(emptyHistory<string>(), 'a')).toBeNull()
    expect(redoStep(emptyHistory<string>(), 'a')).toBeNull()
  })

  it('отмена возвращает снимок «до», повтор — состояние на момент отмены', () => {
    const h = recordAll(['a', 'b'])
    const u1 = undoStep(h, 'c')
    expect(u1?.snapshot).toBe('b')
    const u2 = undoStep(u1?.history ?? h, 'b')
    expect(u2?.snapshot).toBe('a')
    expect(u2?.history.past).toEqual([])
    const r1 = redoStep(u2?.history ?? h, 'a')
    expect(r1?.snapshot).toBe('b')
    const r2 = redoStep(r1?.history ?? h, 'b')
    expect(r2?.snapshot).toBe('c')
    expect(r2?.history.future).toEqual([])
    expect(r2?.history.past).toEqual(['a', 'b'])
  })

  it('новая запись после отмены очищает повтор', () => {
    const undone = undoStep(recordAll(['a', 'b']), 'c')?.history ?? emptyHistory<string>()
    expect(undone.future).toEqual(['c'])
    expect(recordStep(undone, 'b', opts()).future).toEqual([])
  })

  it('лимит: хранятся только последние шаги', () => {
    const h = recordAll(['a', 'b', 'c', 'd'], 3)
    expect(h.past).toEqual(['b', 'c', 'd'])
  })
})

describe('склейка', () => {
  it('тот же ключ в пределах окна — один шаг, отмена возвращает к началу серии', () => {
    let h = recordStep(emptyHistory<string>(), 'a', opts({ key: 'k', now: 1000 }))
    h = recordStep(h, 'b', opts({ key: 'k', now: 1400 }))
    h = recordStep(h, 'c', opts({ key: 'k', now: 1800 }))
    expect(h.past).toEqual(['a'])
    expect(undoStep(h, 'd')?.snapshot).toBe('a')
  })

  it('окно скользит от последней правки, после паузы — новый шаг', () => {
    let h = recordStep(emptyHistory<string>(), 'a', opts({ key: 'k', now: 0 }))
    h = recordStep(h, 'b', opts({ key: 'k', now: WINDOW }))
    expect(h.past).toEqual(['a'])
    h = recordStep(h, 'c', opts({ key: 'k', now: WINDOW * 2 + 1 }))
    expect(h.past).toEqual(['a', 'c'])
  })

  it('другой ключ или без ключа — новый шаг', () => {
    let h = recordStep(emptyHistory<string>(), 'a', opts({ key: 'k', now: 0 }))
    h = recordStep(h, 'b', opts({ key: 'other', now: 1 }))
    h = recordStep(h, 'c', opts({ key: null, now: 2 }))
    h = recordStep(h, 'd', opts({ key: null, now: 3 }))
    expect(h.past).toEqual(['a', 'b', 'c', 'd'])
  })

  it('после отмены тот же ключ не склеивается с отменённым шагом', () => {
    let h = recordStep(emptyHistory<string>(), 'a', opts({ key: 'k', now: 0 }))
    h = recordStep(h, 'b', opts({ key: 'k', now: 10 }))
    h = undoStep(h, 'c')?.history ?? h
    h = recordStep(h, 'a', opts({ key: 'k', now: 20 }))
    expect(h.past).toEqual(['a'])
    expect(h.future).toEqual([])
  })

  it('склейка очищает повтор', () => {
    let h = recordStep(emptyHistory<string>(), 'a', opts({ key: 'k', now: 0 }))
    h = { ...h, future: ['z'] }
    expect(recordStep(h, 'b', opts({ key: 'k', now: 1 })).future).toEqual([])
  })

  it('бесконечное окно склеивает при любой паузе', () => {
    let h = recordStep(emptyHistory<string>(), 'a', opts({ key: 'k', now: 0, mergeWindow: Infinity }))
    h = recordStep(h, 'b', opts({ key: 'k', now: 1e9, mergeWindow: Infinity }))
    expect(h.past).toEqual(['a'])
  })
})

describe('changedFields', () => {
  it('верхний уровень и вложенные поля объектов', () => {
    const before = { label: 'a', container: { kind: 'flex', gap: 1 }, tags: ['x'] }
    const after = { label: 'a', container: { kind: 'flex', gap: 2 }, tags: ['x'] }
    expect(changedFields(before, after)).toEqual(['container.gap', 'tags'])
  })

  it('удалённые и добавленные ключи; новый объект с теми же значениями — поле целиком', () => {
    expect(changedFields({ a: 1, p: { top: 1 } }, { b: 2, p: { top: 1 } })).toEqual(['a', 'b', 'p'])
  })

  it('без изменений — пусто', () => {
    const same = { a: 1 }
    expect(changedFields({ x: same }, { x: same })).toEqual([])
  })
})
