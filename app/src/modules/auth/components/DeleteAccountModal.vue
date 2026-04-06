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
      <div class="warning-box">
        <strong
          style="
            font-family: var(--font-sans), sans-serif;
            font-size: var(--text-title);
          "
          >{{ t('account.menu.deleteAccount.warnBox.title') }}</strong
        >
        <div class="user-email">
          {{ t('contact.contact.email') }}: {{ email }}
        </div>
        <br />
        <div
          class="warning-text"
          v-html="t('account.menu.deleteAccount.warnBox.text')"
        />
      </div>

      <BaseCheckbox v-model="understoodChecked">
        {{ t('account.menu.deleteAccount.confirm') }}
      </BaseCheckbox>

      <div v-if="successMsg" class="message success">{{ successMsg }}</div>
    </template>

    <template #action-text>
      {{ t('global.buttons.delete') }}
    </template>
  </BaseModal>
</template>

<style scoped>
.warning-box {
  background: rgba(246, 82, 82, 0.08);
  border: 1px solid rgba(246, 82, 82, 0.3);
  border-radius: 12px;
  padding: 12px;
}

.warning-box strong {
  color: var(--color-danger);
  display: block;
  margin-bottom: 8px;
}

.user-email {
  font-size: var(--text-sub);
  color: var(--color-on-surface);
  font-weight: 700;
}

.warning-text {
  font-size: var(--text-sub);
  color: var(--color-on-surface);
  line-height: 1.5;
}

.action-buttons {
  margin-top: 16px;
}

.message {
  font-size: var(--text-sub);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  text-align: center;
  margin-top: 16px;
}

.message.error {
  background: var(--color-danger-surface);
  color: var(--color-danger);
}

.message.success {
  background: var(--color-success-surface);
  color: var(--special--green);
}
</style>
