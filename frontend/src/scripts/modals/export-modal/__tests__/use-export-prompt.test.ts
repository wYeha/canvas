/** Тесты состояния шаблона промпта: чтение, запись, сброс и ошибка записи. */
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EXPORT_PROMPT_STORAGE_KEY } from '@/scripts/globals/constants'
import { DEFAULT_EXPORT_PROMPT } from '@/scripts/pages/canvas/export/export-prompt'
import { useExportPrompt } from '@/scripts/modals/export-modal/use-export-prompt'

/** Подменяет localStorage хранилищем на Map; `failWrite` делает запись ошибочной. */
function stubStorage(initial?: string, failWrite = false): Map<string, string> {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(EXPORT_PROMPT_STORAGE_KEY, initial)
  vi.stubGlobal('localStorage', {
    /** Читает значение. */
    getItem: (key: string): string | null => data.get(key) ?? null,
    /** Пишет значение или бросает ошибку квоты. */
    setItem: (key: string, value: string): void => {
      if (failWrite) throw new Error('квота')
      data.set(key, value)
    },
    /** Удаляет значение. */
    removeItem: (key: string): void => void data.delete(key),
  })
  return data
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useExportPrompt', () => {
  it('нет ключа → умолчание, isDefault', () => {
    stubStorage()
    const state = useExportPrompt()
    expect(state.prompt.value).toBe(DEFAULT_EXPORT_PROMPT)
    expect(state.isDefault.value).toBe(true)
  })

  it('читает сохранённое, в том числе пустую строку', () => {
    stubStorage('')
    expect(useExportPrompt().prompt.value).toBe('')
  })

  it('пишет каждое изменение', async () => {
    const data = stubStorage()
    const state = useExportPrompt()
    state.prompt.value = 'новый'
    await nextTick()
    expect(data.get(EXPORT_PROMPT_STORAGE_KEY)).toBe('новый')
    expect(state.isDefault.value).toBe(false)
  })

  it('сброс удаляет ключ и возвращает умолчание', async () => {
    const data = stubStorage('свой')
    const state = useExportPrompt()
    state.reset()
    await nextTick()
    expect(state.prompt.value).toBe(DEFAULT_EXPORT_PROMPT)
    expect(data.has(EXPORT_PROMPT_STORAGE_KEY)).toBe(false)
  })

  it('ошибка записи поднимает saveFailed', async () => {
    stubStorage(undefined, true)
    const state = useExportPrompt()
    state.prompt.value = 'x'
    await nextTick()
    expect(state.saveFailed.value).toBe(true)
  })
})
