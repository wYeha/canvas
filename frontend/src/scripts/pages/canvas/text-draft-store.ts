/**
 * Pinia-хранилище черновиков текстовых полей «Свойств»: какие поля ещё не записали ввод в документ и как их
 * дописать. Его читают хедер (статус «Сохраняется…»), сохранение документов и экспорт (дописать ввод перед записью).
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/** Дописывает черновик поля в документ (если он изменён и допустим). */
export type DraftFlusher = () => void

export const useTextDraftStore = defineStore('text-draft', () => {
  /** Зарегистрированные поля: ключ — поле, значение — дописывание его черновика. */
  const flushers = new Map<symbol, DraftFlusher>()
  /** Поля с изменённым, но ещё не записанным черновиком. */
  const dirty = ref<ReadonlySet<symbol>>(new Set())

  /** Есть ли несохранённый ввод хотя бы в одном поле. */
  const hasPending = computed(() => dirty.value.size > 0)

  /** Регистрирует поле; возвращает функцию снятия регистрации. */
  function register(key: symbol, flush: DraftFlusher): () => void {
    flushers.set(key, flush)
    /** Снимает регистрацию поля. */
    function unregister(): void {
      flushers.delete(key)
      setDirty(key, false)
    }
    return unregister
  }

  /** Отмечает, что у поля есть (или нет) незаписанный ввод; набор меняется, только если состояние другое. */
  function setDirty(key: symbol, value: boolean): void {
    if (dirty.value.has(key) === value) return
    const next = new Set(dirty.value)
    if (value) next.add(key)
    else next.delete(key)
    dirty.value = next
  }

  /** Дописывает черновики всех полей в документ: перед сохранением, экспортом, сменой документа, уходом со страницы. */
  function flushAll(): void {
    for (const flush of [...flushers.values()]) flush()
  }

  return { hasPending, register, setDirty, flushAll }
})
