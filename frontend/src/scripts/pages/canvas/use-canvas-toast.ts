/** Логика фрагмента CanvasToast: активный тост и его закрытие из общего хранилища тостов. */
import { storeToRefs } from 'pinia'
import type { Ref } from 'vue'
import { useToastStore, type ToastState } from '@/scripts/globals/toast-store'

/** Возвращает активный тост и действие закрытия. */
export function useCanvasToast(): { toast: Ref<ToastState | null>; dismiss: () => void } {
  const store = useToastStore()
  const { toast } = storeToRefs(store)
  return { toast, dismiss: store.dismiss }
}
