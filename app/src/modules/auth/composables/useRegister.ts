import { ref, reactive, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api.ts';
import { usePreferences } from '@/common/composables/usePreferences';
import { apiErrorMessage } from '@/api/errors';

/** Subset of `BaseInput`'s exposed API that these forms rely on. */
interface FocusableInput {
  focus: () => void;
}

export function useRegister() {
  const { t } = useI18n();
  const { currentTheme, currentLanguage } = usePreferences();

  const email = ref('');
  const password = ref('');
  const passwordConfirm = ref('');
  const acceptedTerms = ref(false);
  const submitting = ref(false);
  const formError = ref('');
  const registeredEmail = ref<string | null>(null);

  const emailInputRef = ref<FocusableInput | null>(null);

  const errors = reactive<{
    email?: string;
    password?: string;
    passwordConfirm?: string;
    terms?: string;
  }>({});

  onMounted(() => {
    emailInputRef.value?.focus();
  });

  function clearAllErrors() {
    errors.email = undefined;
    errors.password = undefined;
    errors.passwordConfirm = undefined;
    errors.terms = undefined;
  }

  function clearFieldError(
    field: 'email' | 'password' | 'passwordConfirm' | 'terms',
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

    if (!acceptedTerms.value) {
      errors.terms = t('auth.login.errors.terms_missing');
      ok = false;
    }

    return ok;
  }

  async function restartRegistration() {
    registeredEmail.value = null;
    acceptedTerms.value = false;
    await nextTick();
    emailInputRef.value?.focus();
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

      await api.post('/auth/register', {
        email: email.value,
        password: password.value,
        acceptedTerms: acceptedTerms.value,
        preferences,
      });

      registeredEmail.value = email.value.trim();
      password.value = '';
      passwordConfirm.value = '';
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
    acceptedTerms,
    submitting,
    formError,
    registeredEmail,
    emailInputRef,
    errors,

    clearFieldError,
    restartRegistration,
    submit,
  };
}
