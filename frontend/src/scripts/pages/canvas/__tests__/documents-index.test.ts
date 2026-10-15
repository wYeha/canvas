/** Тесты чистой логики списка документов: запись индекса, сортировка, разбор, подписи времени и меты. */
import { describe, expect, it } from 'vitest'
import {
  formatDocumentMeta,
  formatUpdatedAt,
  parseIndex,
  pickDocumentId,
  removeMeta,
  rootsWord,
  serializeIndex,
  sortMetas,
  toMeta,
  upsertMeta,
} from '@/scripts/pages/canvas/documents-index'
import type { DocumentMeta } from '@/scripts/pages/canvas/documents.types'
import { createDocument, createRootEntry } from '@/scripts/pages/canvas/factories'

/** Запись индекса для тестов. */
function meta(id: string, updatedAt: string, rootCount = 0, name = id): DocumentMeta {
  return { id, name, updatedAt, rootCount }
}

/** Локальное время (тесты не зависят от часового пояса). */
function local(month: number, day: number, hour = 12, minute = 0, year = 2026): Date {
  return new Date(year, month - 1, day, hour, minute)
}

describe('toMeta', () => {
  it('берёт id, имя, время и число корней документа', () => {
    const doc = { ...createDocument('Док'), roots: [createRootEntry('flex', 'A', { x: 0, y: 0 })] }
    expect(toMeta(doc)).toEqual({ id: doc.id, name: 'Док', updatedAt: doc.updatedAt, rootCount: 1 })
  })
})

describe('sortMetas / upsertMeta / removeMeta', () => {
  const old = meta('old', '2026-01-01T00:00:00.000Z')
  const fresh = meta('fresh', '2026-03-01T00:00:00.000Z')

  it('свежие первыми, вход не меняется', () => {
    const input = [old, fresh]
    expect(sortMetas(input).map((m) => m.id)).toEqual(['fresh', 'old'])
    expect(input[0]).toBe(old)
  })

  it('нечитаемая дата — в конец', () => {
    expect(sortMetas([meta('bad', 'не дата'), old]).map((m) => m.id)).toEqual(['old', 'bad'])
  })

  it('равные по времени сохраняют порядок', () => {
    const a = meta('a', old.updatedAt)
    const b = meta('b', old.updatedAt)
    expect(sortMetas([a, b]).map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('upsert заменяет запись с тем же id и пересортировывает', () => {
    const next = upsertMeta([old, fresh], meta('old', '2026-06-01T00:00:00.000Z', 3))
    expect(next.map((m) => m.id)).toEqual(['old', 'fresh'])
    expect(next[0]?.rootCount).toBe(3)
  })

  it('remove убирает запись', () => {
    expect(removeMeta([old, fresh], 'old')).toEqual([fresh])
  })
})

describe('parseIndex', () => {
  it('сериализация и разбор обратимы', () => {
    const metas = [meta('b', '2026-03-01T00:00:00.000Z', 2), meta('a', '2026-01-01T00:00:00.000Z')]
    expect(parseIndex(serializeIndex(metas))).toEqual({ metas, skipped: 0, broken: false })
  })

  it('нет значения — пустой, не сломанный индекс', () => {
    expect(parseIndex(null)).toEqual({ metas: [], skipped: 0, broken: false })
  })

  it('не JSON и не массив — сломанный индекс', () => {
    expect(parseIndex('{').broken).toBe(true)
    expect(parseIndex('{"a":1}').broken).toBe(true)
  })

  it('битые записи и дубли id пропускаются с подсчётом', () => {
    const good = meta('a', '2026-01-01T00:00:00.000Z', 1)
    const raw = JSON.stringify([
      good,
      { id: 'x' },
      null,
      5,
      { ...good, rootCount: -1 },
      { ...good, rootCount: 1.5 },
      good,
    ])
    const parsed = parseIndex(raw)
    expect(parsed.metas).toEqual([good])
    expect(parsed.skipped).toBe(6)
  })

  it('лишние поля записи отбрасываются', () => {
    const raw = JSON.stringify([{ ...meta('a', '2026-01-01T00:00:00.000Z'), extra: 1 }])
    expect(parseIndex(raw).metas[0]).toEqual(meta('a', '2026-01-01T00:00:00.000Z'))
  })
})

describe('pickDocumentId', () => {
  const metas = [meta('old', '2026-01-01T00:00:00.000Z'), meta('fresh', '2026-03-01T00:00:00.000Z')]

  it('предпочитаемый, если он есть', () => {
    expect(pickDocumentId(metas, 'old')).toBe('old')
  })

  it('иначе самый свежий', () => {
    expect(pickDocumentId(metas, 'нет')).toBe('fresh')
    expect(pickDocumentId(metas, null)).toBe('fresh')
  })

  it('пустой индекс — null', () => {
    expect(pickDocumentId([], 'x')).toBeNull()
  })
})

describe('rootsWord', () => {
  it.each([
    [0, 'корневых'],
    [1, 'корневой'],
    [2, 'корневых'],
    [4, 'корневых'],
    [5, 'корневых'],
    [11, 'корневых'],
    [12, 'корневых'],
    [21, 'корневой'],
    [101, 'корневой'],
    [111, 'корневых'],
  ])('%i → %s', (count, word) => {
    expect(rootsWord(count)).toBe(word)
  })
})

describe('formatUpdatedAt', () => {
  const now = local(10, 15, 12, 0)

  it('только что: меньше минуты и время из будущего', () => {
    expect(formatUpdatedAt(local(10, 15, 11, 59).toISOString(), new Date(now.getTime() - 60_000 + 1))).toBe(
      'только что',
    )
    expect(formatUpdatedAt(local(10, 15, 12, 5).toISOString(), now)).toBe('только что')
  })

  it('минуты в пределах часа', () => {
    expect(formatUpdatedAt(local(10, 15, 11, 59).toISOString(), now)).toBe('1 мин назад')
    expect(formatUpdatedAt(local(10, 15, 11, 15).toISOString(), now)).toBe('45 мин назад')
  })

  it('часы в пределах календарного дня', () => {
    expect(formatUpdatedAt(local(10, 15, 9, 30).toISOString(), now)).toBe('2 ч назад')
  })

  it('вчера: предыдущие календарные сутки, даже если прошло меньше 24 часов', () => {
    expect(formatUpdatedAt(local(10, 14, 23, 0).toISOString(), now)).toBe('вчера')
    expect(formatUpdatedAt(local(10, 14, 1, 0).toISOString(), now)).toBe('вчера')
  })

  it('старше — дата «8 окт»', () => {
    expect(formatUpdatedAt(local(10, 8).toISOString(), now)).toBe('8 окт')
    expect(formatUpdatedAt(local(1, 3).toISOString(), now)).toBe('3 янв')
  })

  it('другой год — с годом', () => {
    expect(formatUpdatedAt(local(10, 8, 12, 0, 2025).toISOString(), now)).toBe('8 окт 2025')
  })

  it('нечитаемая дата — пустая строка', () => {
    expect(formatUpdatedAt('мусор', now)).toBe('')
  })
})

describe('formatDocumentMeta', () => {
  const now = local(10, 15)

  it('«изменён вчера · 5 корневых»', () => {
    const m = meta('a', local(10, 14).toISOString(), 5)
    expect(formatDocumentMeta(m, now)).toBe('изменён вчера · 5 корневых')
  })

  it('«изменён 8 окт · 1 корневой»', () => {
    expect(formatDocumentMeta(meta('a', local(10, 8).toISOString(), 1), now)).toBe('изменён 8 окт · 1 корневой')
  })

  it('без читаемой даты — только число корней', () => {
    expect(formatDocumentMeta(meta('a', 'мусор', 0), now)).toBe('0 корневых')
  })
})
