/**
 * DOM-тесты живого зеркала связей: переключатель в плашке зума (запоминается), на месте связи — содержимое источника
 * копиями (клик выделяет связь), вложенные связи внутри зеркала — плашками, выключение возвращает плашку.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { LINKS_MIRRORED_STORAGE_KEY } from '@/scripts/globals/constants'
import { createLinkBlock } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { addChild } from '@/scripts/pages/canvas/tree'
import { useViewSettingsStore } from '@/scripts/pages/canvas/view-settings-store'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import CanvasZoom from '@/views/pages/canvas/CanvasZoom.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует поле: связь lC на корень C внутри a2, в C — связь lB на корень B. */
function setup(): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  const withNested = addChild(makeDoc(), 'C', { ...createLinkBlock('B'), id: 'lB' })
  useLayoutStore().loadDocument(addChild(withNested, 'a2', { ...createLinkBlock('C'), id: 'lC' }))
  mounted = mount(CanvasViewport, { global: { plugins: [pinia] }, attachTo: document.body })
  return mounted
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  localStorage.clear()
})

describe('живое зеркало связей', () => {
  it('по умолчанию выключено: связь — плашка без содержимого', () => {
    const wrapper = setup()
    const plaque = wrapper.get('[data-node-id="lC"]')
    expect(plaque.classes()).not.toContain('canvas-node--mirror')
    expect(plaque.findAll('[data-repeat-of="lC"]')).toHaveLength(0)
  })

  it('включено: содержимое источника копиями, клик по нему выделяет связь, вложенная связь — плашкой', async () => {
    const wrapper = setup()
    useViewSettingsStore().toggleLinksMirrored()
    await wrapper.vm.$nextTick()
    const plaque = wrapper.get('[data-node-id="lC"]')
    expect(plaque.classes()).toEqual(expect.arrayContaining(['canvas-node--link', 'canvas-node--mirror']))
    const copies = plaque.findAll('[data-repeat-of="lC"]')
    expect(copies.map((copy) => copy.text())).toEqual(expect.arrayContaining(['→c1']))
    const nested = copies.find((copy) => copy.classes().includes('canvas-node--link'))
    expect(nested?.classes()).not.toContain('canvas-node--mirror')
    expect(nested?.findAll('[data-repeat-of]')).toHaveLength(0)
    const el = copies[0]?.element
    el?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, isPrimary: true }))
    el?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 1, isPrimary: true }))
    expect(useLayoutStore().selectedId).toBe('lC')
  })

  it('кнопка в плашке зума переключает и запоминает выбор', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    mounted = mount(CanvasZoom, { global: { plugins: [pinia] }, attachTo: document.body })
    const button = mounted.get('button[aria-label="Живое зеркало связей"]')
    expect(button.attributes('aria-pressed')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(localStorage.getItem(LINKS_MIRRORED_STORAGE_KEY)).toBe('true')
  })
})
