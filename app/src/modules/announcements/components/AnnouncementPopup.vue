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
      <span class="popup-title">
        <span
          class="popup-color-indicator"
          :style="{ backgroundColor: color }"
        ></span>
        Announcement
      </span>
    </template>

    <template #content>
      <div class="popup-content">
        {{ announcement.content }}
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.popup-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.popup-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.popup-content {
  padding-block: 10px;
  color: var(--color-on-surface);
  line-height: 1.5;
  font-size: 14px;
}
</style>
