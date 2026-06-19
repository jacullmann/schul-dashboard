<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Pencil, Trash2 } from '@lucide/vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  note: string | null;
  editing: boolean;
  saving: boolean;
  canEdit: boolean;
  modelValue: string;
  reducedMargin?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'edit-start'): void;
  (e: 'edit-cancel'): void;
  (e: 'edit-save'): void;
  (e: 'delete'): void;
}>();

const { t } = useI18n();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

function adjustHeight() {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`;
  }
}

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
  adjustHeight();
}

watch(
  () => props.editing,
  async (isEditing) => {
    if (isEditing) {
      await nextTick();
      adjustHeight();
    }
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="note-section pt-1 border-t border-ghost-border flex justify-between gap-3"
    :class="reducedMargin ? 'mt-0' : 'mt-2'"
  >
    <div class="w-full">
      <div class="text-on-ghost text-base font-bold mb-1">
        {{ t('tasks.list.notes.note') }}
      </div>

      <div
        v-if="!editing"
        class="text-on-ghost text-base whitespace-pre-wrap break-words"
      >
        <span v-if="note">{{ note }}</span>
        <span v-else class="note-placeholder text-on-ghost-muted italic">{{
          t('tasks.list.notes.no_notes')
        }}</span>
      </div>

      <div v-else>
        <textarea
          id="editor-note-input"
          ref="textareaRef"
          :value="modelValue"
          rows="1"
          placeholder="Add a note..."
          maxlength="2000"
          class="w-full pb-2 border-b-2 shadow-none outline-none focus:border-b-4 border-on-ghost-subtle focus:border-on-ghost transition-[border,border-color] duration-200 ease-in-out resize-none overflow-hidden"
          @input="handleInput"
        />
        <BaseRow justify="end" class="mt-2 mb-1">
          <BaseButton
            :disabled="saving"
            variant="ghost"
            @click.stop="$emit('edit-cancel')"
          >
            {{ t('common.buttons.cancel') }}
          </BaseButton>
          <BaseButton
            :disabled="saving"
            variant="action"
            :loading="saving"
            @click.stop="$emit('edit-save')"
          >
            {{ t('common.buttons.save') }}
          </BaseButton>
        </BaseRow>
      </div>
    </div>

    <div v-if="!editing && canEdit" class="flex gap-1 items-start -mr-2">
      <BaseTooltip :content="t('common.buttons.edit')" placement="bottom">
        <BaseButton
          variant="ghost"
          :icon="Pencil"
          size="sm"
          @click.stop="$emit('edit-start')"
        />
      </BaseTooltip>

      <BaseTooltip
        v-if="note"
        :content="t('common.buttons.delete')"
        placement="bottom"
      >
        <BaseButton
          variant="ghost"
          :icon="Trash2"
          size="sm"
          class="text-danger hover:text-danger-hover"
          @click.stop="$emit('delete')"
        />
      </BaseTooltip>
    </div>
  </div>
</template>
