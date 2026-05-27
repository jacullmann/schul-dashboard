import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api.ts';
import { usePreferences } from '@/common/composables/usePreferences';
import type BaseInput from '@/common/components/BaseInput.vue';

export function useRegister(onRegistered: () => void) {
  const { t } = useI18n();
  const { currentTheme, currentLanguage } = usePreferences();

  const email = ref('');
  const password = ref('');
  const passwordConfirm = ref('');
  const acceptedPrivacy = ref(false);
  const submitting = ref(false);
  const message = ref('');
  const isError = ref(false);

  const emailInputRef = ref<InstanceType<typeof BaseInput> | null>(null);

  const errors = reactive<{
    email?: string;
    password?: string;
    passwordConfirm?: string;
    privacy?: string;
  }>({});

  onMounted(() => {
    emailInputRef.value?.focus();
  });

  function clearAllErrors() {
    errors.email = undefined;
    errors.password = undefined;
    errors.passwordConfirm = undefined;
    errors.privacy = undefined;
  }

  function clearFieldError(
    field: 'email' | 'password' | 'passwordConfirm' | 'privacy',
  ) {
    errors[field] = undefined;
    message.value = '';
    isError.value = false;
  }

  function validateBeforeSubmit(): boolean {
    clearAllErrors();
    let ok = true;

    if (!email.value?.trim()) {
      errors.email = t('auth.login.errors.email_missing');
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      errors.email = t('auth.login.errors.email_wrong');
      ok = false;
    }

    if (!password.value) {
      errors.password = t('auth.login.errors.password_missing');
      ok = false;
    } else if (password.value.length < 8) {
      errors.password = t('auth.login.errors.new_short');
      ok = false;
    }

    if (!passwordConfirm.value) {
      errors.passwordConfirm = t('auth.login.errors.confirm_missing');
      ok = false;
    } else if (password.value !== passwordConfirm.value) {
      errors.passwordConfirm = t('auth.login.errors.confirm_wrong');
      ok = false;
    }

    if (!acceptedPrivacy.value) {
      errors.privacy = t('auth.login.errors.terms_missing');
      ok = false;
    }

    return ok;
  }

  async function submit() {
    message.value = '';
    isError.value = false;

    if (!validateBeforeSubmit()) {
      return;
    }

    submitting.value = true;
    try {
      const preferences = {
        theme: currentTheme.value,
        language: currentLanguage.value,
        personalized: true,
      };

      await hw.post('/auth/register', {
        email: email.value,
        password: password.value,
        preferences,
      });

      message.value = t('auth.login.success_register');
      isError.value = false;
      onRegistered();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.value = err.response?.data?.error || t('common.errors.unknown');
      isError.value = true;
    } finally {
      submitting.value = false;
    }
  }

  return {
    email,
    password,
    passwordConfirm,
    acceptedPrivacy,
    submitting,
    message,
    isError,
    emailInputRef,
    errors,

    clearFieldError,
    submit,
  };
}
