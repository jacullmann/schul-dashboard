<script setup lang="ts">
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/common/components/Modal.vue';
import { useDeleteAccount } from '@/modules/auth/composables/useDeleteAccount';
import Checkbox from '@/common/components/Checkbox.vue';

const { t } = useI18n();

const props = defineProps<{
  email: string;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'deleted'): void;
  (e: 'error', msg: string): void;
}>();

const {
  understoodChecked,
  submitting,
  errorMsg,
  successMsg,
  confirmDelete
} = useDeleteAccount(emit);

</script>

<template>
  <Modal @cancel="$emit('cancel')">
    <template #title>
      {{ t('account.menu.deleteAccount.title') }}
    </template>

    <template #content>
      <div style="margin-top:16px; font-family: var(--normal-font), sans-serif;">
        <div class="warning-box">
          <strong style="font-family: var(--normal-font), sans-serif; font-size: var(--font-size-title)">{{ t('account.menu.deleteAccount.warnBox.title')}}</strong>
          <div class="user-email">{{ t('contact.contact.email') }}: {{ email }}</div>
          <br>
          <div class="warning-text" v-html="t('account.menu.deleteAccount.warnBox.text')" />
        </div>

        <label class="checkbox-row">
          <Checkbox v-model="understoodChecked" />
          <span class="checkbox-text">{{ t('account.menu.deleteAccount.confirm') }}</span>
        </label>

        <div v-if="errorMsg" class="message error">{{ errorMsg }}</div>
        <div v-if="successMsg" class="message success">{{ successMsg }}</div>
      </div>
    </template>

    <template #action-btn>
      <button
          class="btn danger"
          @click="confirmDelete"
          :disabled="submitting || !understoodChecked"
      >
        <LoadingSpinner v-if="submitting" size="1.1em" />
        <span v-else>{{ t('global.buttons.delete') }}</span>
      </button>
    </template>
  </Modal>
</template>

<style scoped>

.warning-box {
  background: rgba(246, 82, 82, 0.08);
  border: 1px solid rgba(246, 82, 82, 0.3);
  border-radius: 12px;
  padding: 12px;
}

.warning-box strong {
  color: var(--danger);
  display: block;
  margin-bottom: 8px;
}

.user-email {
  font-size: var(--font-size-sub);
  color: var(--text-default);
  font-weight: 700;
}

.warning-text {
  font-size: var(--font-size-sub);
  color: var(--text-default);
  line-height: 1.5;
}

.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  cursor: pointer;
  user-select: none;
}

.checkbox-text {
  font-size: var(--font-size-sub);
  color: var(--text-default);
  user-select: none;
}

.action-buttons {
  margin-top: 16px;
}

.message {
  font-size: var(--font-size-sub);
  padding: 10px 12px;
  border-radius: var(--border-radius-md);
  text-align: center;
  margin-top: 16px;
}

.message.error {
  background: var(--danger-background);
  color: var(--danger);
}

.message.success {
  background: var(--special--green--background);
  color: var(--special--green);
}

</style>