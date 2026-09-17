<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Trash2 } from '@lucide/vue';

defineProps<{
  email: string;
}>();

const emit = defineEmits<{
  (e: 'deleteAccount'): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="animate-fade-up flex flex-col gap-10">
    <section class="flex flex-col gap-2">
      <h3>{{ t('auth.account_settings.account.email') }}</h3>
      <span class="text-base font-semibold text-on-ghost">{{ email }}</span>
    </section>

    <section
      class="flex flex-col gap-3 p-4 border border-danger rounded-xl max-w-160"
    >
      <h3 class="text-danger">
        {{ t('auth.account_settings.danger_zone.title') }}
      </h3>
      <p class="text-sm/relaxed text-on-ghost-muted m-0!">
        {{ t('auth.account_settings.danger_zone.description') }}
      </p>
      <div>
        <BaseButton
          variant="danger"
          :icon="Trash2"
          @click="emit('deleteAccount')"
        >
          {{ t('auth.delete_account.title') }}
        </BaseButton>
      </div>
    </section>
  </div>
</template>
