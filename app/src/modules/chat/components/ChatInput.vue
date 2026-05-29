<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { X, SendHorizontal } from '@lucide/vue';

const { t } = useI18n();

const props = defineProps<{
  modelValue: string;
  replyParent: any | null;
  canSend: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'submit'): void;
  (e: 'input', event: Event): void;
  (e: 'cancelReply'): void;
}>();

const textVal = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val),
});

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  target.style.height = 'auto';
  target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
  emit('input', e);
};
</script>

<template>
  <div class="shrink-0">
    <form
      novalidate
      @submit.prevent="emit('submit')"
      class="p-2 pt-0 flex items-end gap-2"
    >
      <div
        class="flex-1 min-w-0 relative flex flex-col items-stretch py-2.25 px-2.25 min-h-10 bg-surface border border-surface-border focus-within:border-focus focus-within:shadow-focus-ring rounded-2xl transition-all duration-200"
        :class="replyParent ? 'rounded-t-xl' : ''"
      >
        <!-- Quoted message reply header -->
        <Transition name="slide-up">
          <div
            v-if="replyParent"
            class="flex w-full min-w-0 items-center justify-between px-3 py-2 mb-2 rounded-md bg-ghost-hover border-l-4 border-action text-xs text-on-ghost-muted"
          >
            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <span class="text-sm font-bold select-none truncate">
                {{ replyParent.senderName }}
              </span>
              <span class="text-sm font-normal text-on-ghost-subtle truncate">
                {{ replyParent.content }}
              </span>
            </div>
            <BaseButton
              @click="emit('cancelReply')"
              class="p-1.5 hover:text-on-ghost hover:bg-surface-hover/80 rounded-full transition-all duration-150 shrink-0"
              title="Antwort abbrechen"
              variant="ghost"
              on="ghost"
              :icon="X"
            />
          </div>
        </Transition>

        <textarea
          id="chat-input-field"
          v-model="textVal"
          @input="handleInput"
          @keydown.enter.exact.prevent="emit('submit')"
          rows="1"
          class="w-full flex-1 items-center justify-center py-0 px-1.75 rounded-none bg-transparent border-none shadow-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-base/5 text-on-ghost placeholder:text-on-ghost-subtle resize-none font-normal overflow-hidden"
          :placeholder="
            canSend ? t('chat.placeholder') : t('chat.errors.send_deactivated')
          "
          required
          maxlength="1000"
          :disabled="!canSend"
        ></textarea>
      </div>

      <BaseButton
        variant="action"
        on="ghost"
        type="submit"
        :disabled="!textVal.trim() || !canSend"
        :icon="SendHorizontal"
      />
    </form>
  </div>
</template>
