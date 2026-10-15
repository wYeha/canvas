/** Тесты хранилища тостов: показ, закрытие и ограничение длины текста. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { TOAST_MESSAGE_MAX_LENGTH } from '@/scripts/components/ui-toast/ui-toast.constants'
import { clampToastMessage, useToastStore } from '@/scripts/globals/toast-store'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('toast-store', () => {
  it('короткий текст не меняется, dismiss скрывает тост', () => {
    const store = useToastStore()
    store.show('Файл не открыт')
    expect(store.toast?.message).toBe('Файл не открыт')
    store.dismiss()
    expect(store.toast).toBeNull()
  })

  it('длинный текст обрезается до лимита с многоточием', () => {
    const long = 'я'.repeat(TOAST_MESSAGE_MAX_LENGTH * 2)
    const clamped = clampToastMessage(long)
    expect(Array.from(clamped)).toHaveLength(TOAST_MESSAGE_MAX_LENGTH)
    expect(clamped.endsWith('…')).toBe(true)
    const store = useToastStore()
    store.show(long)
    expect(store.toast?.message).toBe(clamped)
  })

  it('текст ровно в лимит остаётся как есть', () => {
    const exact = 'я'.repeat(TOAST_MESSAGE_MAX_LENGTH)
    expect(clampToastMessage(exact)).toBe(exact)
  })
})
