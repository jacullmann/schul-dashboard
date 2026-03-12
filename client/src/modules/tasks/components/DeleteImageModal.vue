<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import Modal from '@/common/components/Modal.vue';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';

const props = defineProps<{
  show: boolean;
  loading?: boolean;
}>();

const emit = defineEmits(['confirm', 'cancel']);

function onKeyDown(e: KeyboardEvent) {
  if (props.show && e.key === 'Enter' && !props.loading) {
    emit('confirm');
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <Modal v-if="show" @cancel="$emit('cancel')">
    <template #title>
      Dieses Bild löschen?
    </template>

    <template #content>
      <p>Wenn du dieses Bild löschst, wird es unwiderruflich entfernt.</p>
    </template>

    <template #action-btn>
      <button
          class="btn danger"
          @click="emit('confirm')"
          :disabled="loading"
      >
        <LoadingSpinner v-if="loading" size="1.1em" />
        <span v-else>Bild löschen</span>
      </button>
    </template>
  </Modal>
</template>

<style scoped>
p {
  text-align: left;
  margin-block: 0 16px;
  font-size: var(--font-size-body);
  color: var(--text);
  line-height: 1.5;
}
</style>