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

        <label class="collapse-checkbox">
          <input
              type="checkbox"
              v-model="understoodChecked"
          >
          <span class="vis-label"></span>
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

<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/components/hw/Modal.vue';
import { useDeleteAccount } from '@/composables/useDeleteAccount';

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

<style scoped>

.warning-box {
  background: rgba(246, 82, 82, 0.08);
  border: 1px solid rgba(246, 82, 82, 0.3);
  border-radius: 12px;
  padding: 12px;
}

.warning-box strong {
  color: var(--special--red);
  display: block;
  margin-bottom: 8px;
}

.user-email {
  font-size: var(--font-size-sub);
  color: var(--text);
  font-weight: 700;
}

.warning-text {
  font-size: var(--font-size-sub);
  color: var(--text);
  line-height: 1.5;
}

.collapse-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  margin-top: 16px;
  gap: 10px;
}

.collapse-checkbox input {
  display: none;
}

.collapse-checkbox .vis-label {
  width: 18px;
  height: 18px;
  min-width: 18px;
  border-radius: 4px;
  border: 2px solid var(--sub);
  display: inline-block;
  background: transparent;
  position: relative;
  flex-shrink: 0;
}

.collapse-checkbox input:checked + .vis-label {
  background: var(--text);
  border-color: var(--text);
}

.collapse-checkbox .vis-label:hover {
  border-color: var(--text);
}

.collapse-checkbox .vis-label::after {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border: solid var(--lbg);
  border-width: 0 2px 2px 0;
  opacity: 0;
  left: 50%;
  top: 32%;
  transform: translate(-50%, -30%) rotate(70deg);
  transition: width 0.3s cubic-bezier(0.25, 1, 0.5, 1), height 0.3s cubic-bezier(0.25, 1, 0.5, 1), transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.collapse-checkbox input:checked + .vis-label::after {
  opacity: 1;
  width: 5px;
  height: 10px;
  transform: translate(-50%, -45%) rotate(45deg);
}

.checkbox-text {
  font-size: var(--font-size-sub);
  color: var(--text);
  user-select: none;
}

.action-buttons {
  margin-top: 16px;
}

.message {
  font-size: var(--font-size-sub);
  padding: 10px 12px;
  border-radius: var(--border-4);
  text-align: center;
  margin-top: 16px;
}

.message.error {
  background: var(--special--red--background);
  color: var(--special--red);
}

.message.success {
  background: var(--special--green--background);
  color: var(--special--green);
}

</style>