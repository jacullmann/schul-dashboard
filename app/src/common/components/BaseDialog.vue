<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineEmits<{
  confirm: [];
  cancel: [];
}>();

withDefaults(
  defineProps<{
    title: string;
    submitText?: string;
    loading?: boolean;
    danger?: boolean;
    open: boolean;
  }>(),
  {
    loading: false,
    danger: false,
    submitText: undefined,
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

    <template #action-text>{{
      submitText ?? t('common.buttons.confirm')
    }}</template>
  </BaseModal>
</template>
