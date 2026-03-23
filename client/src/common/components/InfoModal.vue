<script setup lang="ts">
import { ref } from 'vue'
import { Info } from 'lucide-vue-next'
import BaseModal from '@/common/components/BaseModal.vue'

const props = defineProps<{
  title?: string
  tooltip: string
}>()

const isModalOpen = ref(false)

const openModal = () => (isModalOpen.value = true)
const closeModal = () => (isModalOpen.value = false)
</script>


<template>
  <div class="info-pop-container" :title="props.tooltip">
    <div class="info-icon-wrapper" @click="openModal">
      <Info :size="16" />
    </div>
  </div>

  <Teleport to="body">
    <Transition name="fade-scale">
      <BaseModal v-if="isModalOpen" @cancel="closeModal">
        <template #title>
          <template v-if="props.title">{{ props.title }}</template>
        </template>
        <template #content>
          <div class="popover-content">
            <slot></slot>
          </div>
        </template>
        <template #actions>
          <div style="display: none;"></div>
        </template>
      </BaseModal>
    </Transition>
  </Teleport>
</template>

<style scoped>
.info-pop-container {
  display: flex;
  align-items: center;
}

.info-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-on-surface-muted);
  transition: color 0.15s ease;
}

.info-icon-wrapper:hover {
  color: var(--color-on-surface);
}

.popover-content {
  font-size: var(--text-body);
  color: var(--color-on-surface-muted);
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6, strong, b {
  color: var(--color-on-surface);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: 0.2s;
  opacity: 1;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
}

.fade-scale-enter-active :deep(.modal-card),
.fade-scale-leave-active :deep(.modal-card) {
  transition: all 250ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fade-scale-enter-from :deep(.modal-card),
.fade-scale-leave-to :deep(.modal-card) {
  transform: scale(0);
}
</style>