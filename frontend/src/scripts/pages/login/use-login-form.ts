/** Логика формы входа: пароль, отправка, ошибка от сервера, фокус на поле и переход после входа. */
import { computed, nextTick, onMounted, ref, useTemplateRef, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { safeRedirect } from '@/scripts/globals/auth-guard'
import { useAuthStore } from '@/scripts/globals/auth-store'
import { LOGIN_REDIRECT_QUERY_PARAM } from '@/scripts/globals/constants'
import { LOGIN_PASSWORD_FIELD, LOGIN_PENDING_LABEL, LOGIN_SUBMIT_LABEL } from './constants'

/** Состояние и действия формы входа. */
export interface LoginFormState {
  form: Readonly<ShallowRef<HTMLFormElement | null>>
  password: Ref<string>
  error: Ref<string | null>
  pending: Ref<boolean>
  canSubmit: ComputedRef<boolean>
  submitLabel: ComputedRef<string>
  submit: () => Promise<void>
}

/** Поле пароля формы (по имени, без поиска по документу). */
function passwordInput(form: HTMLFormElement | null): HTMLInputElement | null {
  const field = form?.elements.namedItem(LOGIN_PASSWORD_FIELD)
  return field instanceof HTMLInputElement ? field : null
}

/** Возвращает состояние формы; при неудаче поле пароля очищается и снова получает фокус. */
export function useLoginForm(): LoginFormState {
  const auth = useAuthStore()
  const router = useRouter()
  const route = useRoute()
  const form = useTemplateRef<HTMLFormElement>('form')
  const password = ref('')
  const error = ref<string | null>(null)
  const pending = ref(false)
  const canSubmit = computed(() => !pending.value && password.value !== '')
  const submitLabel = computed(() => (pending.value ? LOGIN_PENDING_LABEL : LOGIN_SUBMIT_LABEL))

  /** Ставит фокус в поле пароля после отрисовки (поле было недоступно, пока шёл запрос). */
  function focusPassword(): void {
    void nextTick(() => passwordInput(form.value)?.focus())
  }

  /** Отправляет пароль; успех — переход по адресу возврата, ошибка — текст под полем. */
  async function submit(): Promise<void> {
    if (!canSubmit.value) return
    pending.value = true
    error.value = null
    const outcome = await auth.login(password.value)
    pending.value = false
    if (outcome.ok) {
      await router.replace(safeRedirect(route.query[LOGIN_REDIRECT_QUERY_PARAM]))
      return
    }
    error.value = outcome.message
    password.value = ''
    focusPassword()
  }

  onMounted(focusPassword)
  return { form, password, error, pending, canSubmit, submitLabel, submit }
}
