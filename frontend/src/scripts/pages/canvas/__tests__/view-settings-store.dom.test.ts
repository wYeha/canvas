/** DOM-тест хранилища настроек редактора: подписи по умолчанию показаны, выбор запоминается в localStorage. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { LABELS_VISIBLE_STORAGE_KEY } from '@/scripts/globals/constants'
import { useViewSettingsStore } from '@/scripts/pages/canvas/view-settings-store'

describe('useViewSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('подписи показаны по умолчанию', () => {
    expect(useViewSettingsStore().labelsVisible).toBe(true)
  })

  it('переключение запоминается и читается новым стором', () => {
    useViewSettingsStore().toggleLabels()
    expect(useViewSettingsStore().labelsVisible).toBe(false)
    expect(localStorage.getItem(LABELS_VISIBLE_STORAGE_KEY)).toBe('false')
    setActivePinia(createPinia())
    expect(useViewSettingsStore().labelsVisible).toBe(false)
    useViewSettingsStore().toggleLabels()
    expect(localStorage.getItem(LABELS_VISIBLE_STORAGE_KEY)).toBe('true')
  })
})
