/** Тесты плана синхронизации: все ветки решения по документу, удаления, конфликт по свежести. */
import { describe, expect, it } from 'vitest'
import { isPlanEmpty, planSync } from '@/scripts/pages/canvas/documents-sync-plan'
import type { DocumentMeta } from '@/scripts/pages/canvas/documents.types'

const T1 = '2026-01-01T00:00:00.000Z'
const T2 = '2026-01-02T00:00:00.000Z'
const T3 = '2026-01-03T00:00:00.000Z'

/** Мета документа. */
function meta(id: string, updatedAt: string): DocumentMeta {
  return { id, name: id, updatedAt, rootCount: 0 }
}

describe('planSync', () => {
  it('одинаковые версии без отметки — только отметка, с отметкой — пустой план', () => {
    expect(planSync([meta('a', T1)], [meta('a', T1)], { synced: {}, deleted: [] }).markSynced).toEqual({ a: T1 })
    expect(isPlanEmpty(planSync([meta('a', T1)], [meta('a', T1)], { synced: { a: T1 }, deleted: [] }))).toBe(true)
  })

  it('изменилась только локальная версия — отправить, даже если она «старше» по часам', () => {
    const plan = planSync([meta('a', T1)], [meta('a', T2)], { synced: { a: T2 }, deleted: [] })
    expect(plan.push).toEqual(['a'])
    expect(plan.pull).toEqual([])
  })

  it('изменилась только серверная версия — скачать', () => {
    const plan = planSync([meta('a', T1)], [meta('a', T2)], { synced: { a: T1 }, deleted: [] })
    expect(plan.pull).toEqual(['a'])
  })

  it('изменились обе или нет отметки — побеждает более свежая', () => {
    expect(planSync([meta('a', T3)], [meta('a', T2)], { synced: { a: T1 }, deleted: [] }).push).toEqual(['a'])
    expect(planSync([meta('a', T2)], [meta('a', T3)], { synced: { a: T1 }, deleted: [] }).pull).toEqual(['a'])
    expect(planSync([meta('a', T2)], [meta('a', T3)], { synced: {}, deleted: [] }).pull).toEqual(['a'])
  })

  it('только локально: новый — отправить, синхронизированный без правок — удалён в другом месте', () => {
    const plan = planSync([meta('new', T1), meta('gone', T1), meta('edited', T2)], [], {
      synced: { gone: T1, edited: T1 },
      deleted: [],
    })
    expect(plan.push).toEqual(['new', 'edited'])
    expect(plan.deleteLocal).toEqual(['gone'])
  })

  it('только на сервере — скачать', () => {
    expect(planSync([], [meta('b', T1)], { synced: {}, deleted: [] }).pull).toEqual(['b'])
  })

  it('удалён локально: есть на сервере — удалить там, нет — забыть отметку; не скачивается обратно', () => {
    const plan = planSync([], [meta('a', T1)], { synced: {}, deleted: ['a', 'b'] })
    expect(plan.deleteRemote).toEqual(['a'])
    expect(plan.forgetDeleted).toEqual(['b'])
    expect(plan.pull).toEqual([])
  })
})
