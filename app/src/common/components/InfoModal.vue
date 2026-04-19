<script setup lang="ts">
import { ref } from 'vue';
import { Info } from '@lucide/vue';

const props = defineProps<{
  title?: string;
  tooltip: string;
}>();

const isModalOpen = ref(false);

const openModal = () => (isModalOpen.value = true);
const closeModal = () => (isModalOpen.value = false);
</script>

<template>
  <div class="flex items-center" :title="props.tooltip">
    <div
      class="flex items-center justify-center cursor-pointer text-on-surface-muted transition-colors duration-150 hover:text-on-surface"
      @click="openModal"
    >
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
          <div class="leading-[1.6]">
            <slot></slot>
          </div>
        </template>
      </BaseModal>
    </Transition>
  </Teleport>
</template>
