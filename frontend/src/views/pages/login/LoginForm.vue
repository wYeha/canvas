<!-- Фрагмент страницы входа: логотип, поле пароля с ошибкой и кнопка «Войти» -->
<template>
  <form ref="form" class="login-form" novalidate @submit.prevent="submit">
    <div class="login-form__brand">
      <UiLogo />
      <h1 class="login-form__title">Layout Canvas</h1>
    </div>
    <UiField v-slot="{ id, describedBy, invalid }" :label="LOGIN_PASSWORD_LABEL" :error="error ?? undefined">
      <UiTextInput
        v-model="password"
        type="password"
        :label="LOGIN_PASSWORD_LABEL"
        :error="invalid"
        :disabled="pending"
        :input-attrs="{
          id,
          name: LOGIN_PASSWORD_FIELD,
          autocomplete: 'current-password',
          'aria-describedby': describedBy,
        }"
      />
    </UiField>
    <UiButton class="login-form__submit" type="submit" variant="primary" :disabled="!canSubmit">
      {{ submitLabel }}
    </UiButton>
  </form>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiLogo from '@/views/components/ui-logo/UiLogo.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import { LOGIN_PASSWORD_FIELD, LOGIN_PASSWORD_LABEL } from '@/scripts/pages/login/constants'
import { useLoginForm } from '@/scripts/pages/login/use-login-form'

const { form, password, error, pending, canSubmit, submitLabel, submit } = useLoginForm()
</script>
