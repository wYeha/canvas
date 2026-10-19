/** DOM-тест кнопки «Шаблоны» в тулбаре: меню из четырёх пунктов, вставка в выделенный блок и корнем, один шаг истории. */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useLabelEditStore } from '@/scripts/pages/canvas/label-edit-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import CanvasToolbar from '@/views/pages/canvas/CanvasToolbar.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует тулбар с документом из фикстуры. */
function setup(): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  useLayoutStore().loadDocument(makeDoc())
  mounted = mount(CanvasToolbar, { global: { plugins: [pinia] }, attachTo: document.body })
  return mounted
}

/** Открывает меню шаблонов и выбирает пункт по номеру. */
async function choose(wrapper: VueWrapper, index: number): Promise<void> {
  await wrapper.find('.ui-dropdown__trigger').trigger('click')
  await wrapper.findAll('.ui-dropdown__item')[index]?.trigger('click')
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('тулбар: шаблоны', () => {
  it('меню содержит четыре пункта', async () => {
    const wrapper = setup()
    await wrapper.find('.ui-dropdown__trigger').trigger('click')
    expect(wrapper.findAll('.ui-dropdown__item').map((i) => i.text())).toEqual([
      'Ряд KPI',
      'Сетка графиков 2×2',
      'Фильтры + таблица',
      'Сайдбар + контент',
    ])
  })

  it('без выделения шаблон встаёт новым корнем, выделяется, ввод подписи не открывается', async () => {
    const wrapper = setup()
    const store = useLayoutStore()
    store.select(null)
    const before = store.document.roots.length
    await choose(wrapper, 3)
    expect(store.document.roots).toHaveLength(before + 1)
    const added = store.document.roots[before]
    expect(added?.canvas.width).toBe(1440)
    expect(store.selectedId).toBe(added?.node.id)
    expect(useLabelEditStore().editingId).toBeNull()
  })

  it('с выделенным блоком шаблон встаёт последним ребёнком, отмена убирает его одним шагом', async () => {
    const wrapper = setup()
    const store = useLayoutStore()
    store.select('a1')
    const rootsBefore = store.document.roots.length
    const childrenBefore = store.selectedNode?.children.length ?? 0
    await choose(wrapper, 0)
    expect(store.document.roots).toHaveLength(rootsBefore)
    const parent = findNode(store.document, 'a1')
    expect(parent?.children).toHaveLength(childrenBefore + 1)
    expect(parent?.children.at(-1)?.label).toBe('Ряд KPI')
    store.undo()
    expect(findNode(store.document, 'a1')?.children).toHaveLength(childrenBefore)
  })
})
