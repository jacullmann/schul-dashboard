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
    margin?: boolean;
    actions?: boolean;
  }>(),
  {
    error: '',
    danger: false,
    loading: false,
    requirement: true,
    margin: false,
    actions: true,
  },
);
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <BaseFormContent :error="error" :class="margin ? 'mx-4' : ''">
      <slot name="content"></slot>
    </BaseFormContent>

    <!-- Stacked full width on mobile: German labels don't wrap and won't fit
         side by side. Reversed so the action sits above cancel while tab
         order stays cancel first. -->
    <div
      v-if="actions || $slots['secondary-action']"
      class="flex flex-col-reverse gap-2 mt-4 md:flex-row md:justify-end"
    >
      <!-- Last on mobile, at the far left on desktop: a way back, set apart
           from the pair that finishes the form. -->
      <slot name="secondary-action"></slot>

      <BaseButton
        v-if="actions && cancel"
        type="button"
        surface
        variant="ghost"
        form
        @click="cancel"
      >
        <slot name="cancel-text">
          {{ t('common.buttons.cancel') }}
        </slot>
      </BaseButton>

      <BaseButton
        v-if="actions"
        type="submit"
        :variant="danger ? 'danger' : 'action'"
        :full="!cancel"
        :loading="loading"
        :disabled="loading || !requirement"
        form
      >
        <slot name="action-text">
          {{ t('common.buttons.confirm') }}
        </slot>
      </BaseButton>
    </div>
  </form>
</template>
