<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
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

<template>
  <BaseModal @cancel="$emit('cancel')">
    <template #title>
      {{ t('account.menu.changePassword.title') }}
    </template>

    <template #content>
      <div class="password-wrapper">
        <BaseLabel for="currentPassword">
          {{ t('account.menu.changePassword.currentPassword') }}
        </BaseLabel>
        <BaseInput
            ref="currentPasswordRef"
            id="currentPassword"
            type="password"
            v-model="currentPassword"
            :placeholder="t('account.menu.changePassword.currentPlaceholder')"
            @input="clearFieldError('current')"
            @keydown.enter="submit"
        />
        <div v-if="errors.current" class="field-error">{{ errors.current }}</div>
      </div>

      <div class="password-wrapper">
        <BaseLabel for="newPassword">
          {{ t('account.menu.changePassword.newPassword') }}
        </BaseLabel>
        <BaseInput
            id="newPassword"
            type="password"
            v-model="newPassword"
            :placeholder="t('account.menu.changePassword.newPlaceholder')"
            @input="clearFieldError('new')"
            @keydown.enter="submit"
        />
        <div v-if="errors.new" class="field-error">{{ errors.new }}</div>
      </div>

      <div class="password-wrapper">
        <BaseLabel for="newPassword2">
          {{ t('account.menu.changePassword.confirmPassword') }}
        </BaseLabel>
        <BaseInput
            id="newPassword2"
            type="password"
            v-model="newPassword2"
            :placeholder="t('account.menu.changePassword.confirmPlaceholder')"
            @input="clearFieldError('confirm')"
            @keydown.enter="submit"
        />
        <div v-if="errors.confirm" class="field-error">{{ errors.confirm }}</div>
      </div>

      <!-- Allgemeine Fehlermeldung -->
      <span v-if="message" :class="{ 'text-danger': isError }">
        {{ message }}
      </span>
    </template>

    <template #action-btn>
      <BaseButton @click="submit" :disabled="submitting" variant="action" :loading="submitting">
        {{ t('account.menu.changePassword.title') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.password-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.field-error {
  color: var(--color-danger);
  font-size: var(--text-sub);
  font-family: var(--font-sans), sans-serif;
  margin-top: 6px;
}
</style>