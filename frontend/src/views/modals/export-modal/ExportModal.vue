<!-- Модалка экспорта: слева охват, список корней и шаблон промпта и правила документа, справа предпросмотр кода; снизу «Скачать» и «Копировать» -->
<template>
  <UiModal v-model:open="open" :title="EXPORT_MODAL_TITLE" size="export" :initial-focus="copyEl">
    <div class="export-modal">
      <div class="export-modal__sidebar">
        <UiField
          v-slot="{ id, labelId, describedBy }"
          :label="EXPORT_SCOPE_LABEL"
          :hint="EXPORT_SCOPE_HINTS[scopeKind]"
        >
          <UiSegmented
            v-model="scopeKind"
            :options="scopeOptions"
            :label="EXPORT_SCOPE_LABEL"
            :input-attrs="{ id, 'aria-labelledby': labelId, 'aria-describedby': describedBy }"
          />
        </UiField>
        <div class="export-modal__roots">
          <h3 :id="EXPORT_ROOTS_LABEL_ID" class="export-modal__caption">{{ EXPORT_ROOTS_LABEL }}</h3>
          <p v-if="rows.length === 0" class="export-modal__note">{{ EXPORT_ROOTS_EMPTY }}</p>
          <ul v-else class="export-modal__root-list" :aria-labelledby="EXPORT_ROOTS_LABEL_ID">
            <li v-for="row in rows" :key="row.id">
              <UiCheckbox
                :model-value="row.checked"
                :label="row.label"
                :disabled="scopeKind !== 'checked'"
                @update:model-value="toggleRoot(row.id, $event)"
              >
                <span class="export-modal__root-width">{{ row.width }}</span>
              </UiCheckbox>
            </li>
          </ul>
        </div>
        <div class="export-modal__prompt">
          <UiField
            v-slot="{ id, describedBy }"
            :label="EXPORT_PROMPT_LABEL"
            :hint="EXPORT_PROMPT_HINT"
            :error="saveFailed ? EXPORT_PROMPT_SAVE_FAILED : undefined"
          >
            <UiTextarea
              v-model="prompt"
              :label="EXPORT_PROMPT_LABEL"
              :rows="EXPORT_PROMPT_ROWS"
              :input-attrs="{ id, 'aria-describedby': describedBy }"
            />
          </UiField>
          <UiButton class="export-modal__reset" :disabled="isDefault" @click="reset">
            {{ EXPORT_PROMPT_RESET }}
          </UiButton>
        </div>
        <div class="export-modal__rules">
          <UiField v-slot="{ id, describedBy }" :label="EXPORT_RULES_LABEL" :hint="EXPORT_RULES_HINT">
            <UiTextarea
              v-model="rules"
              :label="EXPORT_RULES_LABEL"
              :placeholder="EXPORT_RULES_PLACEHOLDER"
              :rows="EXPORT_RULES_ROWS"
              :input-attrs="{ id, 'aria-describedby': describedBy }"
            />
          </UiField>
        </div>
      </div>
      <div class="export-modal__preview">
        <p class="export-modal__meta">{{ meta }}</p>
        <p v-if="actionError" class="export-modal__error" role="alert">{{ actionError }}</p>
        <div class="export-modal__code" role="region" tabindex="0" :aria-label="EXPORT_PREVIEW_LABEL">
          <p v-if="isEmpty" class="export-modal__empty">{{ emptyText }}</p>
          <template v-else>
            <div v-for="line in lines" :key="line.number" class="export-modal__line">
              <span class="export-modal__line-number">{{ line.number }}</span>
              <span class="export-modal__line-text">
                <span v-for="(token, index) in line.tokens" :key="index" :class="tokenClasses(token.kind)">{{
                  token.text
                }}</span>
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
    <template #footer>
      <UiButton :disabled="isEmpty" @click="download">{{ EXPORT_DOWNLOAD_LABEL }}</UiButton>
      <UiButton :ref="setCopyButton" :variant="copied ? 'success' : 'primary'" :disabled="isEmpty" @click="copy">
        {{ copied ? EXPORT_COPIED_LABEL : EXPORT_COPY_LABEL }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiCheckbox from '@/views/components/ui-checkbox/UiCheckbox.vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiModal from '@/views/components/ui-modal/UiModal.vue'
import UiSegmented from '@/views/components/ui-segmented/UiSegmented.vue'
import UiTextarea from '@/views/components/ui-textarea/UiTextarea.vue'
import {
  EXPORT_COPIED_LABEL,
  EXPORT_COPY_LABEL,
  EXPORT_DOWNLOAD_LABEL,
  EXPORT_MODAL_TITLE,
  EXPORT_PREVIEW_LABEL,
  EXPORT_PROMPT_HINT,
  EXPORT_PROMPT_LABEL,
  EXPORT_PROMPT_RESET,
  EXPORT_PROMPT_ROWS,
  EXPORT_PROMPT_SAVE_FAILED,
  EXPORT_ROOTS_EMPTY,
  EXPORT_ROOTS_LABEL,
  EXPORT_ROOTS_LABEL_ID,
  EXPORT_RULES_HINT,
  EXPORT_RULES_LABEL,
  EXPORT_RULES_PLACEHOLDER,
  EXPORT_RULES_ROWS,
  EXPORT_SCOPE_HINTS,
  EXPORT_SCOPE_LABEL,
} from '@/scripts/modals/export-modal/export-modal.constants'
import { useExportModal } from '@/scripts/modals/export-modal/use-export-modal'
import { useExportCopyFocus } from '@/scripts/modals/export-modal/use-export-copy-focus'

// true — окно показано; закрытие (Esc, оверлей, крестик) сбрасывает значение в false
const open = defineModel<boolean>('open', { default: false })
const {
  scopeKind,
  scopeOptions,
  rows,
  toggleRoot,
  prompt,
  isDefault,
  saveFailed,
  reset,
  lines,
  meta,
  emptyText,
  isEmpty,
  tokenClasses,
  rules,
  copied,
  actionError,
  copy,
  download,
} = useExportModal(open)
const { copyEl, setCopyButton } = useExportCopyFocus()
</script>
