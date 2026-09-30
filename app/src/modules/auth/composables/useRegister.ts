import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api.ts';
import { usePreferences } from '@/common/composables/usePreferences';
import { apiErrorMessage } from '@/api/errors';
import { useToast } from '@/common/composables/useToast';

/** Subset of `BaseInput`'s exposed API that these forms rely on. */
interface FocusableInput {
  focus: () => void;
}

export function useRegister(onRegistered: () => void | Promise<void>) {
  const { t } = useI18n();
  const { currentTheme, currentLanguage } = usePreferences();

  const email = ref('');
  const password = ref('');
  const passwordConfirm = ref('');
  const acceptedPrivacy = ref(false);
  const submitting = ref(false);
  const formError = ref('');

  const emailInputRef = ref<FocusableInput | null>(null);

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
    formError.value = '';
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
    formError.value = '';

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

      useToast().success(t('auth.login.success_register'));
      void onRegistered();
    } catch (e: unknown) {
      formError.value = apiErrorMessage(e, t('common.errors.unknown'));
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
    formError,
    emailInputRef,
    errors,

    clearFieldError,
    submit,
  };
}
