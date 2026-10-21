/**
 * DOM-тесты системного буфера (17.4): Ctrl+C не отменяется, событие `copy` получает JSON-фрагмент; Ctrl+V в «другой
 * вкладке» (другой стор и документ) вставляет фрагмент с источниками из события `paste`; без события — запасной
 * внутренний буфер; битый фрагмент — сообщение, документ не меняется; чужой текст — внутренний буфер.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { FRAGMENT_FORMAT, parseFragment } from '@shared'
import { useToastStore } from '@/scripts/globals/toast-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { useCanvasHotkeys } from '@/scripts/pages/canvas/use-canvas-hotkeys'
import { linkedDoc, otherDoc } from './clipboard-fixture'

let mounted: VueWrapper | null = null

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

/** Пустой обработчик опций горячих клавиш. */
function noop(): void {}

/** Блокировки горячих клавиш нет. */
function notBlocked(): boolean {
  return false
}

/** Компонент только с горячими клавишами канваса. */
const Hotkeys = defineComponent({
  /** Подключает горячие клавиши. */
  setup() {
    useCanvasHotkeys({ openExport: noop, openHotkeys: noop, isBlocked: notBlocked })
    return noop
  },
})

/** «Вкладка»: свой стор с документом и выделением, смонтированные горячие клавиши. */
function openTab(doc: ReturnType<typeof linkedDoc>, selected: string): ReturnType<typeof useLayoutStore> {
  mounted?.unmount()
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useLayoutStore()
  store.loadDocument(doc)
  store.select(selected)
  mounted = mount(Hotkeys, { global: { plugins: [pinia] } })
  return store
}

/** Нажимает Ctrl + клавишу `code` на странице; возвращает, отменено ли нажатие. */
function ctrlKey(code: string): boolean {
  const event = new KeyboardEvent('keydown', { code, ctrlKey: true, bubbles: true, cancelable: true })
  document.body.dispatchEvent(event)
  return event.defaultPrevented
}

/** Событие буфера `type` с подменённым `clipboardData` (`text` — содержимое для вставки); отдаёт записанный текст. */
function clipboardEvent(type: 'copy' | 'paste', text = ''): { event: Event; written: () => string } {
  let written = ''
  const event = new Event(type, { bubbles: true, cancelable: true })
  /** Запись в буфер. */
  function setData(_format: string, value: string): void {
    written = value
  }
  /** Чтение из буфера. */
  function getData(): string {
    return text
  }
  Object.defineProperty(event, 'clipboardData', { value: { setData, getData } })
  document.body.dispatchEvent(event)
  /** Текст, записанный в буфер событием. */
  function writtenText(): string {
    return written
  }
  return { event, written: writtenText }
}

/** Ждёт следующий такт (запасной путь вставки). */
async function nextTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10))
}

/** Копирует блок `id` документа со связями и возвращает текст, записанный в системный буфер. */
function copyFromLinkedDoc(id: string): string {
  openTab(linkedDoc(), id)
  expect(ctrlKey('KeyC')).toBe(false)
  const { event, written } = clipboardEvent('copy')
  expect(event.defaultPrevented).toBe(true)
  return written()
}

describe('системный буфер обмена', () => {
  it('Ctrl+C пишет в событие copy фрагмент с источниками связей', () => {
    const parsed = parseFragment(copyFromLinkedDoc('p1'))
    expect(parsed.kind).toBe('fragment')
    if (parsed.kind === 'fragment') expect(parsed.fragment.sources.map((entry) => entry.node.id)).toEqual(['I', 'K'])
  })

  it('Ctrl+V в другой вкладке вставляет фрагмент из события paste вместе с источниками', async () => {
    const text = copyFromLinkedDoc('p1')
    const store = openTab(otherDoc(), 'X')
    expect(ctrlKey('KeyV')).toBe(false)
    const { event } = clipboardEvent('paste', text)
    expect(event.defaultPrevented).toBe(true)
    await nextTick()
    expect(store.document.roots.map((entry) => entry.node.id)).toEqual(['X', 'I', 'K'])
    expect(store.document.roots[0]?.node.children).toHaveLength(1)
  })

  it('без события paste — запасной внутренний буфер (один раз)', async () => {
    const store = openTab(linkedDoc(), 'p2')
    ctrlKey('KeyC')
    await nextTick()
    store.select('P')
    ctrlKey('KeyV')
    await nextTick()
    expect(store.document.roots[0]?.node.children).toHaveLength(3)
  })

  it('битый фрагмент — сообщение об ошибке, документ не меняется; чужой текст — внутренний буфер', async () => {
    const store = openTab(otherDoc(), 'X')
    const before = store.document
    ctrlKey('KeyV')
    clipboardEvent('paste', JSON.stringify({ format: FRAGMENT_FORMAT, version: 1, node: {} }))
    await nextTick()
    expect(store.document).toBe(before)
    expect(useToastStore().toast?.message).toContain('Фрагмент')
    ctrlKey('KeyV')
    const { event } = clipboardEvent('paste', 'просто текст')
    expect(event.defaultPrevented).toBe(false)
    expect(store.document).toBe(before)
  })
})
