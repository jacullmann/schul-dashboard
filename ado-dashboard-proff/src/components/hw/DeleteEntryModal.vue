<template>
  <Modal v-if="show" @cancel="$emit('cancel')">
    <template #title>
      Diesen Eintrag löschen?
    </template>

    <template #content>
      <p>Wenn du diesen Eintrag löschst, werden dieser und alle dazugehörigen Bilder unwiderruflich gelöscht.</p>
    </template>

    <template #action-btn>
      <button
          class="btn danger"
          @click="emit('confirm')"
          :disabled="loading"
      >
        <LoadingSpinner v-if="loading" size="1.1em" />
        <span v-else>Eintrag löschen</span>
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
// Parntdatei prüfen, ob props korrekt übergeben werden
import { onMounted, onBeforeUnmount } from 'vue';
import Modal from '@/components/hw/Modal.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

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

<style scoped>
p {
  text-align: left;
  margin-block: 0 16px;
  font-size: var(--font-size-body);
  color: var(--text);
  line-height: 1.5;
}
</style>