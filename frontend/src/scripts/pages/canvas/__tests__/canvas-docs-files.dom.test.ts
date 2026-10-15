/** DOM-тесты файлов .json в меню документов: открытие (успех, не JSON, не схема, большой файл), скачивание, тост. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { downloadText } from '@/scripts/globals/download'
import { useToastStore } from '@/scripts/globals/toast-store'
import { IMPORT_MAX_BYTES } from '@/scripts/pages/canvas/documents-constants'
import { serializeDocument } from '@/scripts/pages/canvas/documents-files'
import { useDocumentsStore } from '@/scripts/pages/canvas/documents-store'
import { createDocument } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import CanvasDocsMenu from '@/views/pages/canvas/CanvasDocsMenu.vue'
import CanvasToast from '@/views/pages/canvas/CanvasToast.vue'

vi.mock('@/scripts/globals/download', () => ({ downloadText: vi.fn(() => true) }))

let mounted: VueWrapper[] = []

/** Монтирует меню и слой тостов на общем pinia. */
function setup(): { menu: VueWrapper; toasts: VueWrapper } {
  const pinia = createPinia()
  setActivePinia(pinia)
  useDocumentsStore().init({ demo: false })
  const menu = mount(CanvasDocsMenu, { global: { plugins: [pinia] }, attachTo: document.body })
  const toasts = mount(CanvasToast, { global: { plugins: [pinia] }, attachTo: document.body })
  mounted = [menu, toasts]
  return { menu, toasts }
}

/** Имитирует выбор файла в скрытом input. */
async function chooseFile(menu: VueWrapper, file: File): Promise<void> {
  const input = menu.find<HTMLInputElement>('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}

/** Ждёт, пока файл прочитается и обработается (условие выполнится). */
async function settled(check: () => boolean): Promise<void> {
  await vi.waitFor(() => {
    expect(check()).toBe(true)
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(downloadText).mockClear()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  mounted.forEach((wrapper) => {
    wrapper.unmount()
  })
  mounted = []
  vi.restoreAllMocks()
})

describe('CanvasDocsMenu: файлы .json', () => {
  it('input принимает только .json, пункты файлов доступны', async () => {
    const { menu } = setup()
    expect(menu.find('input[type="file"]').attributes('accept')).toContain('.json')
    await menu.find('button').trigger('click')
    const actions = menu.findAll('[role="menuitem"]')
    expect(actions.map((a) => a.attributes('aria-disabled'))).toEqual([undefined, undefined, undefined])
  })

  it('успешное открытие: новый документ становится текущим, прежний сохранён, тоста нет', async () => {
    const { menu, toasts } = setup()
    const documents = useDocumentsStore()
    const layout = useLayoutStore()
    const before = documents.currentId
    const source = createDocument('Из файла')
    await chooseFile(menu, new File([serializeDocument(source)], 'a.layout.json'))
    await settled(() => layout.document.name === 'Из файла')

    expect(layout.document.id).not.toBe(source.id)
    expect(documents.currentId).toBe(layout.document.id)
    expect(documents.entries.map((meta) => meta.id)).toContain(before)
    expect(toasts.find('.ui-toast').exists()).toBe(false)
  })

  it('не JSON: тост-ошибка (role alert) с причиной, документ не меняется', async () => {
    const { menu, toasts } = setup()
    const layout = useLayoutStore()
    const before = layout.document
    await chooseFile(menu, new File(['<html>'], 'a.json'))
    await settled(() => useToastStore().toast !== null)

    const toast = toasts.find('.ui-toast')
    expect(toast.attributes('role')).toBe('alert')
    expect(toast.text()).toContain('Файл не открыт: это не JSON')
    expect(layout.document).toBe(before)
  })

  it('JSON не по схеме: тост с русским сообщением parseDocument, документ не меняется', async () => {
    const { menu, toasts } = setup()
    const layout = useLayoutStore()
    const before = layout.document
    await chooseFile(menu, new File(['{"a":1}'], 'a.json'))
    await settled(() => useToastStore().toast !== null)

    expect(toasts.find('.ui-toast').text()).toContain('Документ повреждён')
    expect(layout.document).toBe(before)
    expect(useDocumentsStore().entries).toHaveLength(1)
  })

  it('слишком большой файл: тост про лимит', async () => {
    const { menu } = setup()
    const toast = useToastStore()
    const big = new File(['{}'], 'big.json')
    Object.defineProperty(big, 'size', { value: IMPORT_MAX_BYTES + 1 })
    await chooseFile(menu, big)
    await settled(() => toast.toast !== null)
    expect(toast.toast?.message).toBe('Файл не открыт: файл больше 2 МБ')
  })

  it('«Сохранить в .json» скачивает текущий документ файлом <название>.layout.json и закрывает меню', async () => {
    const { menu } = setup()
    useLayoutStore().renameDocument('Лендинг')
    await menu.find('button').trigger('click')
    await menu.findAll('[role="menuitem"]')[2]?.trigger('click')

    expect(downloadText).toHaveBeenCalledTimes(1)
    const [name, text, mime] = vi.mocked(downloadText).mock.calls[0] ?? []
    expect(name).toBe('Лендинг.layout.json')
    expect(JSON.parse(String(text))).toMatchObject({ name: 'Лендинг' })
    expect(mime).toBe('application/json')
    expect(menu.find('[role="menu"]').exists()).toBe(false)
  })

  it('если скачать не вышло — тост-ошибка', async () => {
    const { menu } = setup()
    vi.mocked(downloadText).mockReturnValueOnce(false)
    await menu.find('button').trigger('click')
    await menu.findAll('[role="menuitem"]')[2]?.trigger('click')
    expect(useToastStore().toast?.message).toBe('Не удалось скачать файл')
  })
})
