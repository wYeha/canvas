/** Логика UiToast: роль по виду, BEM-классы и автоскрытие по таймеру (перезапускается при смене текста). */
import { computed, onBeforeUnmount, watch, type ComputedRef } from 'vue'
import { TOAST_DURATION_MS } from './ui-toast.constants'
import type { UiToastEmits, UiToastProps } from './ui-toast.types'

/** Состояние тоста для шаблона. */
export interface UiToastState {
  role: ComputedRef<'alert' | 'status'>
  classes: ComputedRef<string[]>
}

/** Возвращает роль и классы; по истечении `duration` эмитит `close`. */
export function useUiToast(props: UiToastProps, emit: (event: keyof UiToastEmits) => void): UiToastState {
  let timer: ReturnType<typeof setTimeout> | null = null

  /** Снимает таймер автоскрытия. */
  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  /** Время автоскрытия: заданное явно, иначе у ошибки его нет (читают и перечитывают), у обычного тоста — стандартное. */
  function durationMs(): number {
    return props.duration ?? (props.kind === 'error' ? 0 : TOAST_DURATION_MS)
  }

  /** Запускает таймер автоскрытия заново (0 — тост не скрывается сам). */
  function restart(): void {
    clearTimer()
    const duration = durationMs()
    if (duration <= 0) return
    timer = setTimeout(() => {
      emit('close')
    }, duration)
  }

  watch(() => [props.message, props.duration, props.kind], restart, { immediate: true })
  onBeforeUnmount(clearTimer)

  const role = computed(() => (props.kind === 'error' ? 'alert' : 'status'))
  const classes = computed(() => ['ui-toast', `ui-toast--${props.kind ?? 'info'}`])
  return { role, classes }
}
