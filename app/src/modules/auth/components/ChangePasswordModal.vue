<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChangePassword } from '@/modules/auth/composables/useChangePassword';

const { t } = useI18n();

defineProps<{
  open: boolean;
}>();

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
  submit,
} = useChangePassword(emit);

const currentPasswordRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  currentPasswordRef.value?.focus();
});
</script>

<template>
  <BaseModal
    :open="open"
    @cancel="$emit('cancel')"
    :submit="submit"
    :error="isError ? message : undefined"
    :loading="submitting"
  >
    <template #title>
      {{ t('account.menu.changePassword.title') }}
    </template>

    <template #content>
      <BaseFormGroup id="currentPassword" :error="errors.current">
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
          :aria-describedby="
            errors.current ? 'currentPassword-error' : undefined
          "
        />
      </BaseFormGroup>

      <BaseFormGroup id="newPassword" :error="errors.new">
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
          :aria-describedby="errors.new ? 'newPassword-error' : undefined"
        />
      </BaseFormGroup>

      <BaseFormGroup id="newPassword2" :error="errors.confirm">
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
          :aria-describedby="errors.confirm ? 'newPassword2-error' : undefined"
        />
      </BaseFormGroup>

      <span v-if="message && !isError">
        {{ message }}
      </span>
    </template>

    <template #action-text>
      {{ t('account.menu.changePassword.title') }}
    </template>
  </BaseModal>
</template>
