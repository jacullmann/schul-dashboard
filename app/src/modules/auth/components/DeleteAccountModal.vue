<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useDeleteAccount } from '@/modules/auth/composables/useDeleteAccount';

const { t } = useI18n();

const props = defineProps<{
  email: string;
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
    @cancel="$emit('cancel')"
    :submit="confirmDelete"
    :loading="submitting"
    :danger="true"
    :requirement="understoodChecked"
    :error="errorMsg"
  >
    <template #title>
      {{ t('account.menu.deleteAccount.title') }}
    </template>

    <template #content>
      <div class="bg-[rgba(246,82,82,0.08)] border border-[rgba(246,82,82,0.3)] rounded-xl p-3">
        <strong
          class="font-sans text-title text-danger block mb-2"
          >{{ t('account.menu.deleteAccount.warnBox.title') }}</strong
        >
        <div class="text-sub text-on-surface font-bold">
          {{ t('contact.contact.email') }}: {{ email }}
        </div>
        <br />
        <div
          class="text-sub text-on-surface leading-[1.5]"
          v-html="t('account.menu.deleteAccount.warnBox.text')"
        />
      </div>

      <BaseCheckbox v-model="understoodChecked">
        {{ t('account.menu.deleteAccount.confirm') }}
      </BaseCheckbox>

      <div v-if="successMsg" class="text-sub p-2 px-3 rounded-md text-center mt-4 text-[var(--special--green)] bg-success-surface">{{ successMsg }}</div>
    </template>

    <template #action-text>
      {{ t('global.buttons.delete') }}
    </template>
  </BaseModal>
</template>
