<!-- Фрагмент страницы canvas: выпадашка документов в хедере (список, переименование и удаление в строке, новый документ) -->
<template>
  <div ref="root" class="canvas-docs-menu">
    <span ref="trigger" class="canvas-docs-menu__trigger" @click="toggle" @keydown="onTriggerKeydown">
      <UiButton
        v-bind="triggerAttrs"
        class="canvas-docs-menu__button"
        variant="ghost"
        icon-after="chevron-down"
        :disabled="isDemo"
        :title="isDemo ? DOCS_MENU_DEMO_TITLE : DOCS_MENU_LABEL"
      >
        {{ docName }}
      </UiButton>
    </span>
    <ul
      v-if="isOpen"
      :id="menuId"
      ref="list"
      class="canvas-docs-menu__list"
      role="menu"
      tabindex="-1"
      :style="listStyle"
      :aria-label="DOCS_MENU_LABEL"
      :aria-activedescendant="activeId"
      @keydown="onListKeydown"
    >
      <li
        v-for="(item, index) in items"
        :id="itemId(index)"
        :key="item.value"
        :class="itemClasses(item, index)"
        :role="item.kind === 'doc' ? 'menuitemradio' : 'menuitem'"
        :aria-checked="item.kind === 'doc' ? item.current === true : undefined"
        :aria-disabled="item.disabled ? 'true' : undefined"
        :aria-keyshortcuts="item.kind === 'doc' ? DOC_ROW_KEYSHORTCUTS : undefined"
        :title="item.title"
        @mousemove="setActive(index)"
        @click="choose(index)"
      >
        <template v-if="item.kind === 'action'">{{ item.label }}</template>
        <UiTextInput
          v-else-if="editing?.id === item.value && editing.mode === 'rename'"
          v-model="draft"
          class="canvas-docs-menu__input"
          :label="DOCS_MENU_NAME_FIELD_LABEL"
          :input-attrs="{ maxlength: DOCUMENT_NAME_MAX_LENGTH }"
        />
        <div v-else-if="editing?.id === item.value" class="canvas-docs-menu__confirm">
          <span class="canvas-docs-menu__confirm-text">Удалить «{{ item.label }}»?</span>
          <UiButton class="canvas-docs-menu__confirm-button" @click.stop="cancelEdit">
            {{ DOCS_MENU_CANCEL_LABEL }}
          </UiButton>
          <UiButton class="canvas-docs-menu__confirm-button" variant="danger" @click.stop="confirmDelete">
            {{ DOCS_MENU_DELETE_LABEL }}
          </UiButton>
        </div>
        <template v-else>
          <span class="canvas-docs-menu__check">
            <UiIcon v-if="item.current" name="check" />
          </span>
          <span class="canvas-docs-menu__text">
            <span class="canvas-docs-menu__name">{{ item.label }}</span>
            <span class="canvas-docs-menu__meta">{{ item.meta }}</span>
          </span>
          <span class="canvas-docs-menu__actions">
            <UiIconButton icon="edit" :label="DOCS_MENU_RENAME_LABEL" @click.stop="beginRename(item.value)" />
            <UiIconButton icon="trash" :label="DOCS_MENU_DELETE_LABEL" @click.stop="beginDelete(item.value)" />
          </span>
        </template>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import UiButton from '@/views/components/ui-button/UiButton.vue'
import UiIcon from '@/views/components/ui-icon/UiIcon.vue'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'
import {
  DOC_ROW_KEYSHORTCUTS,
  DOCS_MENU_CANCEL_LABEL,
  DOCS_MENU_DELETE_LABEL,
  DOCS_MENU_DEMO_TITLE,
  DOCS_MENU_LABEL,
  DOCS_MENU_NAME_FIELD_LABEL,
  DOCS_MENU_RENAME_LABEL,
  DOCUMENT_NAME_MAX_LENGTH,
} from '@/scripts/pages/canvas/documents-constants'
import { useCanvasDocsMenu } from '@/scripts/pages/canvas/use-canvas-docs-menu'

const {
  root,
  trigger,
  list,
  isOpen,
  listStyle,
  menuId,
  items,
  docName,
  isDemo,
  editing,
  draft,
  activeId,
  triggerAttrs,
  itemId,
  itemClasses,
  setActive,
  choose,
  toggle,
  beginRename,
  beginDelete,
  cancelEdit,
  confirmDelete,
  onTriggerKeydown,
  onListKeydown,
} = useCanvasDocsMenu()
</script>
