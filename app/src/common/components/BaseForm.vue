<script setup lang="ts">
import { useI18n} from 'vue-i18n';

const { t } = useI18n();

const props = withDefaults(defineProps<{
  submit: () => void
  cancellable?: boolean
}>(), {
  cancellable: true
});
</script>

<template>
  <form @submit.prevent="submit" novalidate>
    <BaseFormContent>
      <slot name="content"></slot>
    </BaseFormContent>

    <BaseRow justify="end" class="mt-4">
      <slot name="actions">
        <BaseButton v-if="cancellable" type="button" @click="$emit('cancel')" variant="ghost">
          {{ t('global.buttons.cancel') }}
        </BaseButton>

        <slot name="action-btn">
          <BaseButton type="submit" variant="action" :class="{'w-full': !cancellable}">
            {{ t('global.buttons.confirm') }}
          </BaseButton>
        </slot>
      </slot>
    </BaseRow>
  </form>
</template>