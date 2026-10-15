/**
 * Pinia-хранилище внутреннего буфера блоков: копия поддерева живёт только в редакторе, системный буфер обмена
 * не трогается (не мешает копированию текста). Узлы документа неизменяемы, поэтому хранится ссылка на снимок.
 */
import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { LayoutNode } from '@shared'

/** Содержимое буфера: поддерево и ширина превью, если копировался корень (для вставки корнем). */
export interface ClipboardEntry {
  node: LayoutNode
  rootWidth: number | null
}

export const useNodeClipboardStore = defineStore('node-clipboard', () => {
  /** Скопированное поддерево; `null` — буфер пуст. */
  const entry = shallowRef<ClipboardEntry | null>(null)
  /** Есть ли что вставлять. */
  const hasContent = computed(() => entry.value !== null)

  /** Кладёт поддерево в буфер, заменяя прежнее содержимое. */
  function copy(node: LayoutNode, rootWidth: number | null): void {
    entry.value = { node, rootWidth }
  }

  /** Очищает буфер. */
  function clear(): void {
    entry.value = null
  }

  return { entry, hasContent, copy, clear }
})
