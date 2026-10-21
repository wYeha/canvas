/**
 * DOM-тесты черновиков подписи и описания (13.2): ввод записывается в документ после паузы без blur, до паузы
 * статус «есть незаписанный ввод», открытие экспорта и сохранение документов дописывают ввод сразу.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { TEXT_DRAFT_COMMIT_MS } from '@/scripts/pages/canvas/constants'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { useTextDraftStore } from '@/scripts/pages/canvas/text-draft-store'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import { useCanvasHistory } from '@/scripts/pages/canvas/use-canvas-history'
import { useCanvasPage } from '@/scripts/pages/canvas/use-canvas-page'
import CanvasPropsBlock from '@/views/pages/canvas/CanvasPropsBlock.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует секцию «Блок» с выделенным блоком a2. */
async function setup(): Promise<VueWrapper> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useLayoutStore()
  store.loadDocument(makeDoc())
  store.select('a2')
  mounted = mount(CanvasPropsBlock, { global: { plugins: [pinia] }, attachTo: document.body })
  await mounted.vm.$nextTick()
  return mounted
}

/** Описание блока a2 в документе. */
function description(): string | undefined {
  return findNode(useLayoutStore().document, 'a2')?.description
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  vi.useRealTimers()
})

describe('черновик описания', () => {
  it('записывается после паузы в наборе без blur; до паузы — незаписанный ввод', async () => {
    const wrapper = await setup()
    await wrapper.get('textarea').setValue('Шапка сайта')
    expect(description()).toBe('')
    expect(useTextDraftStore().hasPending).toBe(true)
    vi.advanceTimersByTime(TEXT_DRAFT_COMMIT_MS)
    expect(description()).toBe('Шапка сайта')
    expect(useTextDraftStore().hasPending).toBe(false)
  })

  it('сеанс набора с паузами дольше окна склейки — один шаг истории', async () => {
    const wrapper = await setup()
    const area = wrapper.get('textarea')
    await area.setValue('Ша')
    vi.advanceTimersByTime(TEXT_DRAFT_COMMIT_MS)
    // Пауза в наборе дольше HISTORY_MERGE_MS: сеанс тот же, шаг тот же
    vi.advanceTimersByTime(2000)
    await area.setValue('Шапка')
    vi.advanceTimersByTime(TEXT_DRAFT_COMMIT_MS)
    expect(description()).toBe('Шапка')
    useLayoutStore().undo()
    expect(description()).toBe('')
  })

  it('отмена с тулбара во время паузы: ввод сначала записывается, отмена убирает сеанс, повтор возвращает', async () => {
    const wrapper = await setup()
    const area = wrapper.get('textarea')
    await area.setValue('Шапка')
    vi.advanceTimersByTime(TEXT_DRAFT_COMMIT_MS)
    await area.setValue('Шапка сайта')
    const history = useCanvasHistory()
    history.undo()
    expect(description()).toBe('')
    vi.advanceTimersByTime(TEXT_DRAFT_COMMIT_MS)
    expect(useLayoutStore().canRedo).toBe(true)
    history.redo()
    expect(description()).toBe('Шапка сайта')
  })

  it('черновик не пишется в другой документ с теми же id', async () => {
    const wrapper = await setup()
    await wrapper.get('textarea').setValue('Чужой ввод')
    const store = useLayoutStore()
    store.loadDocument({ ...makeDoc(), id: 'other-doc' })
    wrapper.unmount()
    mounted = null
    expect(description()).toBe('')
    expect(store.canUndo).toBe(false)
  })

  it('открытие экспорта дописывает ввод сразу', async () => {
    const wrapper = await setup()
    await wrapper.get('textarea').setValue('Подвал')
    useCanvasPage().openExport()
    expect(description()).toBe('Подвал')
  })
})
