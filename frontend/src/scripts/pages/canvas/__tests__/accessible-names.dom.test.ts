/**
 * DOM-тест доступных имён (13.4): у каждой кнопки и переключателя страницы редактора есть имя — текст, `aria-label`
 * или `aria-labelledby` (`title` не считается: часть инструментов и агентов его не читает); стрелки «Слоёв» различаются.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createTestRouter } from '@/scripts/globals/__tests__/test-router'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import CanvasPage from '@/views/pages/canvas/CanvasPage.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует страницу с документом-фикстурой и выделенным блоком `selected`. */
async function mountPage(selected: string): Promise<void> {
  const pinia = createPinia()
  setActivePinia(pinia)
  mounted = mount(CanvasPage, { global: { plugins: [pinia, createTestRouter()] }, attachTo: document.body })
  await flushPromises()
  useLayoutStore().loadDocument(makeDoc())
  useLayoutStore().select(selected)
  await flushPromises()
}

/** Кнопки и переключатели без доступного имени (их разметка для сообщения об ошибке). */
function nameless(): string[] {
  const controls = document.body.querySelectorAll('button, [role="button"], [role="radio"], [role="switch"]')
  return Array.from(controls)
    .filter((el) => {
      const name = el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby') ?? el.textContent
      return name.trim() === ''
    })
    .map((el) => el.outerHTML.slice(0, 120))
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('доступные имена', () => {
  it.each(['a1', 'a2', 'A'])('у всех кнопок страницы есть имя (выделен %s)', async (id) => {
    await mountPage(id)
    expect(nameless()).toEqual([])
  })

  it('стрелки «Слоёв» называют свой блок', async () => {
    await mountPage('a1')
    const labels = Array.from(document.body.querySelectorAll('.canvas-layer-item__toggle')).map((el) =>
      el.getAttribute('aria-label'),
    )
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels).toContain('Свернуть «A»')
  })
})
