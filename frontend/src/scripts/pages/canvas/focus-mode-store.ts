/**
 * Pinia-хранилище режима фокуса (16.7): блок, поддерево которого изолировано на поле (остальное затемнено).
 * Нужно полю (вход по двойному клику, выход по клику мимо), оверлею (затемнение) и горячим клавишам (Esc — выход).
 * Состояние просмотра: в документ и историю не идёт.
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { NodeId } from '@shared'

export const useFocusModeStore = defineStore('focus-mode', () => {
  /** Блок в фокусе; `null` — режим выключен. */
  const focusId = ref<NodeId | null>(null)

  /** Включает фокус на блоке `id`. */
  function enter(id: NodeId): void {
    focusId.value = id
  }

  /** Выключает режим фокуса. */
  function exit(): void {
    focusId.value = null
  }

  return { focusId, enter, exit }
})
