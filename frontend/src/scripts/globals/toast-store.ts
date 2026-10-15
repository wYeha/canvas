/** Pinia-хранилище тостов: одно активное сообщение (новое заменяет старое), показ и закрытие. */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { UiToastKind } from '@/scripts/components/ui-toast/ui-toast.types'

/** Активный тост: `id` меняется при каждом показе, чтобы таймер автоскрытия начинался заново. */
export interface ToastState {
  id: number
  message: string
  kind: UiToastKind
}

export const useToastStore = defineStore('toast', () => {
  const toast = ref<ToastState | null>(null)
  let seq = 0

  /** Показывает тост; по умолчанию это ошибка. */
  function show(message: string, kind: UiToastKind = 'error'): void {
    seq++
    toast.value = { id: seq, message, kind }
  }

  /** Скрывает тост. */
  function dismiss(): void {
    toast.value = null
  }

  return { toast, show, dismiss }
})
