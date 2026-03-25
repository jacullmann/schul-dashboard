<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';

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
  <BaseModal v-if="show" @cancel="$emit('cancel')">
    <template #title>
      Diesen Eintrag löschen?
    </template>

    <template #content>
      <p>Wenn du diesen Eintrag löschst, werden dieser und alle dazugehörigen Bilder unwiderruflich gelöscht.</p>
    </template>

    <template #action-btn>
      <BaseButton @click="emit('confirm')" :disabled="loading" variant="danger" :loading="loading">
        Eintrag löschen
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
p {
  text-align: left;
  margin-block: 0 16px;
  font-size: var(--text-body);
  color: var(--color-on-surface);
  line-height: 1.5;
}
</style>