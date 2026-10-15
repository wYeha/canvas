/** Логика UiToast: роль по виду, BEM-классы и автоскрытие по таймеру (перезапускается при смене текста). */
import { computed, onBeforeUnmount, watch, type ComputedRef } from 'vue'
import type { UiToastEmits, UiToastProps } from './ui-toast.types'

/** Состояние тоста для шаблона. */
export interface UiToastState {
  role: ComputedRef<'alert' | 'status'>
  classes: ComputedRef<string[]>
}

/** Возвращает роль и классы; по истечении `duration` эмитит `close`. */
export function useUiToast(props: Required<UiToastProps>, emit: (event: keyof UiToastEmits) => void): UiToastState {
  let timer: ReturnType<typeof setTimeout> | null = null

  /** Снимает таймер автоскрытия. */
  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  /** Запускает таймер автоскрытия заново (0 — тост не скрывается сам). */
  function restart(): void {
    clearTimer()
    if (props.duration <= 0) return
    timer = setTimeout(() => {
      emit('close')
    }, props.duration)
  }

  watch(() => [props.message, props.duration], restart, { immediate: true })
  onBeforeUnmount(clearTimer)

  const role = computed(() => (props.kind === 'error' ? 'alert' : 'status'))
  const classes = computed(() => ['ui-toast', `ui-toast--${props.kind}`])
  return { role, classes }
}
