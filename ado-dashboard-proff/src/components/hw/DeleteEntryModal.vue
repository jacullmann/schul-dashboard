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
          @click="$emit('confirm')"
      >
        Eintrag löschen
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue';

defineProps<{
  show: boolean
}>()

defineEmits(['confirm', 'cancel'])
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