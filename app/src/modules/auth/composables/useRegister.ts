import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/hwApi';
import { usePreferences } from '@/common/composables/usePreferences';
import type BaseInput from '@/common/components/BaseInput.vue';

export function useRegister(
  onRegistered: () => void,
) {
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
      errors.email = t('account.auth.errors.emailMissing');
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      errors.email = t('account.auth.errors.emailWrong');
      ok = false;
    }

    if (!password.value) {
      errors.password = t('account.auth.errors.passwordMissing');
      ok = false;
    } else if (password.value.length < 8) {
      errors.password = t('account.auth.errors.newShort');
      ok = false;
    }

    if (!passwordConfirm.value) {
      errors.passwordConfirm = t('account.auth.errors.confirmMissing');
      ok = false;
    } else if (password.value !== passwordConfirm.value) {
      errors.passwordConfirm = t('account.auth.errors.confirmWrong');
      ok = false;
    }

    if (!acceptedPrivacy.value) {
      errors.privacy = t('account.auth.errors.termsMissing');
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

      await hw.post('/api/auth/register', {
        email: email.value,
        password: password.value,
        preferences,
      });

      message.value = t('account.auth.successRegister');
      isError.value = false;
      onRegistered();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.value = err.response?.data?.error || t('global.errors.unknown');
      isError.value = true;
    } finally {
      submitting.value = false;
    }
  }

  return {
    // State
    email,
    password,
    passwordConfirm,
    acceptedPrivacy,
    submitting,
    message,
    isError,
    emailInputRef,
    errors,

    // Methods
    clearFieldError,
    submit,
  };
}
