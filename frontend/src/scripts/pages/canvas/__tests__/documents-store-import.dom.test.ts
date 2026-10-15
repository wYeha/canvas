/** Тесты импорта документа в хранилище: новый id, уникальное имя, текущий документ, сброс истории, сохранение. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DOCUMENT_STORAGE_PREFIX } from '@/scripts/globals/constants'
import { useDocumentsStore } from '@/scripts/pages/canvas/documents-store'
import { createDocument } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

describe('documents.importDocument', () => {
  it('добавляет документ как новый: другой id, текущий, загрузка засчитана, прежний остался в списке', () => {
    const documents = useDocumentsStore()
    documents.init({ demo: false })
    const before = documents.currentId
    const seq = documents.loadSeq
    const file = createDocument('Из файла')

    expect(documents.importDocument(file)).toEqual({ ok: true })

    expect(documents.currentId).not.toBe(file.id)
    expect(documents.currentId).not.toBe(before)
    expect(useLayoutStore().document.name).toBe('Из файла')
    expect(documents.loadSeq).toBe(seq + 1)
    expect(documents.entries.map((meta) => meta.id)).toContain(before)
    expect(documents.entries).toHaveLength(2)
    expect(localStorage.getItem(`${DOCUMENT_STORAGE_PREFIX}${String(documents.currentId)}`)).not.toBeNull()
  })

  it('повторный импорт того же файла не затирает документ: имя получает (2), id разные', () => {
    const documents = useDocumentsStore()
    documents.init({ demo: false })
    const file = createDocument('Лендинг')
    documents.importDocument(file)
    const firstId = documents.currentId
    documents.importDocument(file)

    expect(documents.currentId).not.toBe(firstId)
    expect(documents.entries.map((meta) => meta.name).sort()).toEqual(['Без названия', 'Лендинг', 'Лендинг (2)'])
  })

  it('сбрасывает историю: после импорта отменять нечего', () => {
    const documents = useDocumentsStore()
    documents.init({ demo: false })
    const layout = useLayoutStore()
    layout.addRoot('flex', 'A', { x: 0, y: 0 })
    expect(layout.canUndo).toBe(true)
    documents.importDocument(createDocument('Из файла'))
    expect(layout.canUndo).toBe(false)
  })
})
