<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    submitText: string;
    loading?: boolean;
    danger?: boolean;
    open: boolean;
  }>(),
  {
    loading: false,
    danger: false,
    submitText: 'Confirm',
  },
);
</script>

<template>
  <BaseModal
    :open="open"
    :sheet="true"
    :submit="() => $emit('confirm')"
    :loading="loading"
    :danger="danger"
    @cancel="$emit('cancel')"
  >
    <template #title>{{ title }}</template>

    <template #content>
      <p class="m-0!"><slot></slot></p>
    </template>

    <template #action-text>{{ submitText }}</template>
  </BaseModal>
</template>
