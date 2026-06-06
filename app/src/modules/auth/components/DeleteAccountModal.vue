<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useDeleteAccount } from '@/modules/auth/composables/useDeleteAccount';

const { t } = useI18n();

const props = defineProps<{
  email: string;
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'deleted'): void;
  (e: 'error', msg: string): void;
}>();

const { understoodChecked, submitting, errorMsg, successMsg, confirmDelete } =
  useDeleteAccount(emit);
</script>

<template>
  <BaseModal
    :open="open"
    :submit="confirmDelete"
    :loading="submitting"
    :danger="true"
    :requirement="understoodChecked"
    :error="errorMsg"
    @cancel="$emit('cancel')"
  >
    <template #title>
      {{ t('auth.delete_account.title') }}
    </template>

    <template #content>
      <div class="bg-danger-hover border border-danger rounded-xl px-3 py-2">
        <strong class="font-sans text-lg text-danger block mb-2">{{
          t('auth.delete_account.warn_box.title')
        }}</strong>
        <div class="text-sm text-on-ghost font-bold">
          {{ t('common.contact.email') }}: {{ email }}
        </div>
        <br />
        <div
          class="text-sm/relaxed text-on-ghost"
          v-html="t('auth.delete_account.warn_box.text')"
        ></div>
      </div>

      <BaseCheckbox v-model="understoodChecked">
        {{ t('auth.delete_account.confirm') }}
      </BaseCheckbox>

      <div
        v-if="successMsg"
        class="text-sm p-2 px-3 rounded-md text-center mt-4 text-[var(--special--green)] bg-success-surface"
      >
        {{ successMsg }}
      </div>
    </template>

    <template #action-text>
      {{ t('common.buttons.delete') }}
    </template>
  </BaseModal>
</template>
