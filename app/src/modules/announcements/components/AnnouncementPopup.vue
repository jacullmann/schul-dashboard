<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import type BaseButton from '@/common/components/BaseButton.vue';

const { t } = useI18n();

const props = defineProps({
  announcement: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['cancel']);

const confirmBtnRef = ref<InstanceType<typeof BaseButton> | null>(null);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    cancel();
  }
}

useEventListener(window, 'keydown', onKeyDown);

onMounted(() => {
  setTimeout(() => {
    confirmBtnRef.value?.focus();
  }, 50);
});

const color = computed(() => {
  const map: Record<string, string> = {
    info: 'var(--text-default)',
    warn: 'var(--color-warn)',
    danger: 'var(--color-danger)',
  };
  return map[props.announcement.color as string] || 'var(--text-default)';
});

function cancel() {
  emit('cancel');
}
</script>

<template>
  <BaseModal @cancel="cancel">
    <template #title>
      <span class="flex items-center gap-3">
        <span
          class="w-3 h-3 rounded-full flex-shrink-0"
          :style="{ backgroundColor: color }"
        ></span>
        Announcement
      </span>
    </template>

    <template #content>
      <div class="py-2.5 text-on-ghost text-sm/relaxed">
        {{ announcement.content }}
      </div>
    </template>
  </BaseModal>
</template>
