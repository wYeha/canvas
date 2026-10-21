/**
 * Pinia-хранилище внутреннего буфера блоков: последний скопированный фрагмент (поддерево и источники его связей).
 * Основной путь копирования — системный буфер обмена (17.4); внутренний — запасной: если браузер не дал записать или
 * прочитать системный буфер, а также когда в системном буфере чужой текст. Узлы неизменяемы — хранится ссылка.
 */
import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { LayoutFragment } from '@shared'

export const useNodeClipboardStore = defineStore('node-clipboard', () => {
  /** Скопированный фрагмент; `null` — буфер пуст. */
  const entry = shallowRef<LayoutFragment | null>(null)
  /** Есть ли что вставлять. */
  const hasContent = computed(() => entry.value !== null)

  /** Кладёт фрагмент в буфер, заменяя прежнее содержимое. */
  function copy(fragment: LayoutFragment): void {
    entry.value = fragment
  }

  /** Очищает буфер. */
  function clear(): void {
    entry.value = null
  }

  return { entry, hasContent, copy, clear }
})
