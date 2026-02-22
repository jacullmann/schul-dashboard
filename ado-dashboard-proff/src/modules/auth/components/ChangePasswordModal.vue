<template>
  <Modal @cancel="$emit('cancel')">
    <template #title>
      {{ t('account.menu.changePassword.title') }}
    </template>

    <template #content>
      <!-- Aktuelles Passwort -->
      <div class="password-wrapper">
        <label for="currentPassword">
          {{ t('account.menu.changePassword.currentPassword') }}
        </label>
        <div class="input-wrapper">
          <input
              ref="currentPasswordRef"
              id="currentPassword"
              class="input"
              :type="showCurrentPassword ? 'text' : 'password'"
              v-model="currentPassword"
              :placeholder="t('account.menu.changePassword.currentPlaceholder')"
              @input="clearFieldError('current')"
              @keydown.enter="submit"
          />
          <button
              type="button"
              @click="showCurrentPassword = !showCurrentPassword"
              class="password-toggle"
              aria-label="Toggle password visibility"
          >
            <component :is="showCurrentPassword ? EyeOff : Eye" :size="20" />
          </button>
        </div>
        <div v-if="errors.current" class="field-error">{{ errors.current }}</div>
      </div>

      <!-- Neues Passwort -->
      <div class="password-wrapper">
        <label for="newPassword">
          {{ t('account.menu.changePassword.newPassword') }}
        </label>
        <div class="input-wrapper">
          <input
              id="newPassword"
              class="input"
              :type="showNewPassword ? 'text' : 'password'"
              v-model="newPassword"
              :placeholder="t('account.menu.changePassword.newPlaceholder')"
              @input="clearFieldError('new')"
              @keydown.enter="submit"
          />
          <button
              type="button"
              @click="showNewPassword = !showNewPassword"
              class="password-toggle"
              aria-label="Toggle password visibility"
          >
            <component :is="showNewPassword ? EyeOff : Eye" :size="20" />
          </button>
        </div>
        <div v-if="errors.new" class="field-error">{{ errors.new }}</div>
      </div>

      <!-- Neues Passwort bestätigen -->
      <div class="password-wrapper">
        <label for="newPassword2">
          {{ t('account.menu.changePassword.confirmPassword') }}
        </label>
        <div class="input-wrapper">
          <input
              id="newPassword2"
              class="input"
              :type="showNewPassword2 ? 'text' : 'password'"
              v-model="newPassword2"
              :placeholder="t('account.menu.changePassword.confirmPlaceholder')"
              @input="clearFieldError('confirm')"
              @keydown.enter="submit"
          />
          <button
              type="button"
              @click="showNewPassword2 = !showNewPassword2"
              class="password-toggle"
              aria-label="Toggle password visibility"
          >
            <component :is="showNewPassword2 ? EyeOff : Eye" :size="20" />
          </button>
        </div>
        <div v-if="errors.confirm" class="field-error">{{ errors.confirm }}</div>
      </div>

      <!-- Allgemeine Fehlermeldung -->
      <label v-if="message" :style="{ color: isError ? 'var(--danger)' : 'var(--text)' }">
        {{ message }}
      </label>
    </template>

    <template #action-btn>
      <button
          class="btn action"
          @click="submit"
          :disabled="submitting"
      >
        <LoadingSpinner v-if="submitting" size="1.1em" />
        <span v-else>{{ t('account.menu.changePassword.title') }}</span>
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/common/components/Modal.vue';
import { useChangePassword } from '@/modules/auth/composables/useChangePassword';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'success'): void;
}>();

const {
  currentPassword,
  newPassword,
  newPassword2,
  showCurrentPassword,
  showNewPassword,
  showNewPassword2,
  submitting,
  message,
  isError,
  errors,
  clearFieldError,
  submit
} = useChangePassword(emit);

const currentPasswordRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  currentPasswordRef.value?.focus();
});
</script>

<style scoped>
.password-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.input-wrapper {
  display: flex;
  flex-direction: row;
  position: relative;
  align-items: center;
}

.field-error {
  color: var(--danger);
  font-size: var(--font-size-sub);
  font-family: var(--normal-font), sans-serif;
  margin-top: 6px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--sub);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.1s ease;
}

.password-toggle:hover {
  color: var(--text);
}
</style>