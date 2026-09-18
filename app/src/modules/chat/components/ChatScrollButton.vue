<script setup lang="ts">
import { ArrowDown } from '@lucide/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();
</script>

<template>
  <Transition name="scale-fade">
    <BaseButton
      v-if="show"
      variant="action"
      class="row-start-1 col-start-1 z-10 self-end justify-self-end mb-8 mr-4 md:mb-12 md:mr-8"
      :title="t('chat.scroll_down')"
      :icon="ArrowDown"
      @click="emit('click')"
    />
  </Transition>
</template>

<style scoped>
.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.scale-fade-enter-from,
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.75) translateY(8px);
}
</style>
