/** Pinia-хранилище тостов: одно активное сообщение (новое заменяет старое), показ и закрытие. */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { TOAST_MESSAGE_MAX_LENGTH } from '@/scripts/components/ui-toast/ui-toast.constants'
import type { UiToastKind } from '@/scripts/components/ui-toast/ui-toast.types'

/** Активный тост: `id` меняется при каждом показе, чтобы таймер автоскрытия начинался заново. */
export interface ToastState {
  id: number
  message: string
  kind: UiToastKind
}

/** Многоточие в конце обрезанного текста тоста. */
const ELLIPSIS = '…'

/** Ограничивает текст тоста `TOAST_MESSAGE_MAX_LENGTH` символами (по кодовым точкам), лишнее заменяет многоточием. */
export function clampToastMessage(message: string): string {
  const chars = Array.from(message)
  if (chars.length <= TOAST_MESSAGE_MAX_LENGTH) return message
  return `${chars.slice(0, TOAST_MESSAGE_MAX_LENGTH - ELLIPSIS.length).join('')}${ELLIPSIS}`
}

export const useToastStore = defineStore('toast', () => {
  const toast = ref<ToastState | null>(null)
  let seq = 0

  /** Показывает тост (текст ограничен по длине); по умолчанию это ошибка. */
  function show(message: string, kind: UiToastKind = 'error'): void {
    seq++
    toast.value = { id: seq, message: clampToastMessage(message), kind }
  }

  /** Скрывает тост. */
  function dismiss(): void {
    toast.value = null
  }

  return { toast, show, dismiss }
})
