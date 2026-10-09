<script setup lang="ts">
import { AlertCircle } from '@lucide/vue';
import { useI18n } from 'vue-i18n';

defineEmits<{
  retry: [];
}>();

const { t } = useI18n();
</script>

<template>
  <!-- Takes the place of content that failed to load, so an empty space is
       never mistaken for there being nothing. -->
  <div
    role="alert"
    class="flex items-center gap-2 p-3 bg-surface border border-ghost-border rounded-xl text-sm text-on-ghost-muted"
  >
    <AlertCircle :size="20" class="shrink-0 text-danger" />
    <span class="flex-1 min-w-0 text-left"><slot></slot></span>
    <BaseButton size="sm" class="shrink-0" @click="$emit('retry')">
      {{ t('common.buttons.retry') }}
    </BaseButton>
  </div>
</template>
