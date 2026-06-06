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
    :submit="submit"
    :error="isError ? message : undefined"
    :loading="submitting"
    @cancel="$emit('cancel')"
  >
    <template #title>
      {{ t('auth.change_password.title') }}
    </template>

    <template #content>
      <BaseFormGroup id="currentPassword" :error="errors.current">
        <BaseLabel for="currentPassword">
          {{ t('auth.change_password.current_password') }}
        </BaseLabel>
        <BaseInput
          id="currentPassword"
          ref="currentPasswordRef"
          v-model="currentPassword"
          type="password"
          :placeholder="t('auth.change_password.current_placeholder')"
          :aria-describedby="
            errors.current ? 'currentPassword-error' : undefined
          "
          @input="clearFieldError('current')"
          @keydown.enter="submit"
        />
      </BaseFormGroup>

      <BaseFormGroup id="newPassword" :error="errors.new">
        <BaseLabel for="newPassword">
          {{ t('auth.change_password.new_password') }}
        </BaseLabel>
        <BaseInput
          id="newPassword"
          v-model="newPassword"
          type="password"
          :placeholder="t('auth.change_password.new_placeholder')"
          :aria-describedby="errors.new ? 'newPassword-error' : undefined"
          @input="clearFieldError('new')"
          @keydown.enter="submit"
        />
      </BaseFormGroup>

      <BaseFormGroup id="newPassword2" :error="errors.confirm">
        <BaseLabel for="newPassword2">
          {{ t('auth.change_password.confirm_password') }}
        </BaseLabel>
        <BaseInput
          id="newPassword2"
          v-model="newPassword2"
          type="password"
          :placeholder="t('auth.change_password.confirm_placeholder')"
          :aria-describedby="errors.confirm ? 'newPassword2-error' : undefined"
          @input="clearFieldError('confirm')"
          @keydown.enter="submit"
        />
      </BaseFormGroup>

      <span v-if="message && !isError">
        {{ message }}
      </span>
    </template>

    <template #action-text>
      {{ t('auth.change_password.title') }}
    </template>
  </BaseModal>
</template>
