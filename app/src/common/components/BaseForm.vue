<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const emit = defineEmits<{
  cancel: [];
}>();

const props = withDefaults(defineProps<{
  submit: () => void;
  cancel?: () => void;
  danger?: boolean;
  error?: string;
  loading?: boolean;
  requirement?: boolean;
}>(), {
  error: '',
  danger: false,
  loading: false,
  requirement: true,
});
</script>

<template>
  <form @submit.prevent="submit" novalidate>
    <BaseFormContent :error="error">
      <slot name="content"></slot>
    </BaseFormContent>

    <BaseRow justify="end" class="mt-4">
      <BaseButton v-if="cancel" type="button" variant="ghost" on="canvas" @click="cancel">
        <slot name="cancel-text">
          {{ t('global.buttons.cancel') }}
        </slot>
      </BaseButton>

      <BaseButton type="submit" :variant="danger ? 'danger' : 'action'" :class="{'w-full font-semibold justify-center': !cancel}" :loading="loading" :disabled="loading || !requirement">
        <slot name="action-text">
          {{ t('global.buttons.confirm') }}
        </slot>
      </BaseButton>
    </BaseRow>
  </form>
</template>