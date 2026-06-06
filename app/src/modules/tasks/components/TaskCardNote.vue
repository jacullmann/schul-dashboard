<script setup lang="ts">
import { Pencil, Trash2 } from '@lucide/vue';
import { useI18n } from 'vue-i18n';

defineProps<{
  note: string | null;
  editing: boolean;
  saving: boolean;
  canEdit: boolean;
  modelValue: string;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'edit-start'): void;
  (e: 'edit-cancel'): void;
  (e: 'edit-save'): void;
  (e: 'delete'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div
    class="note-section mt-2 pt-1 border-t border-surface-border flex justify-between gap-3"
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
        <BaseInput
          id="editor-note-input"
          as="textarea"
          :model-value="modelValue"
          rows="3"
          placeholder="Anmerkung eingeben..."
          maxlength="2000"
          @update:model-value="$emit('update:modelValue', $event)"
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
