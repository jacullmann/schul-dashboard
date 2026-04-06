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
    title="Diesen Eintrag löschen?"
    message="Wenn du diesen Eintrag löschst, werden dieser und alle dazugehörigen"
    submit-text="Eintrag löschen"
  />
</template>
