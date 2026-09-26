<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

defineEmits<{
  cancel: [];
}>();

withDefaults(
  defineProps<{
    submit: () => void;
    cancel?: () => void;
    danger?: boolean;
    error?: string;
    loading?: boolean;
    requirement?: boolean;
  }>(),
  {
    error: '',
    danger: false,
    loading: false,
    requirement: true,
  },
);
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <BaseFormContent :error="error">
      <slot name="content"></slot>
    </BaseFormContent>

    <!-- Stacked full width on mobile: German labels don't wrap and won't fit
         side by side. Reversed so the action sits above cancel while tab
         order stays cancel first. -->
    <div class="flex flex-col-reverse gap-2 mt-4 md:flex-row md:justify-end">
      <BaseButton
        v-if="cancel"
        type="button"
        variant="ghost"
        class="max-md:w-full"
        @click="cancel"
      >
        <slot name="cancel-text">
          {{ t('common.buttons.cancel') }}
        </slot>
      </BaseButton>

      <BaseButton
        type="submit"
        :variant="danger ? 'danger' : 'action'"
        :full="!cancel"
        :loading="loading"
        :disabled="loading || !requirement"
        class="max-md:w-full"
      >
        <slot name="action-text">
          {{ t('common.buttons.confirm') }}
        </slot>
      </BaseButton>
    </div>
  </form>
</template>
