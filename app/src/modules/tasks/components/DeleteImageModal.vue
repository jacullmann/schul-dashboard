<script setup lang="ts">
const props = defineProps<{
  show: boolean;
  loading?: boolean;
}>();

const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <BaseDialog
    v-if="show"
    @cancel="$emit('cancel')"
    :submit="() => emit('confirm')"
    :loading="loading"
    :danger="true"
    title="Dieses Bild löschen?"
    submit-text="Bild löschen"
  >
    Wenn du dieses Bild löschst, wird es unwiderruflich entfernt.
  </BaseDialog>
</template>
