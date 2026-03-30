import { ref, reactive, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/hwApi';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { usePreferences } from '@/common/composables/usePreferences';
import type BaseInput from '@/common/components/BaseInput.vue';

export function useAuthModal(onLoggedIn: () => void) {
  const { t } = useI18n();
  const { cancelMfaLogin, resetMfaState } = useMfa();
  const { currentTheme, currentLanguage } = usePreferences();

  const tabs = computed(() => [
    { id: 'login', label: t('account.auth.login'), routePath: '' },
    { id: 'register', label: t('account.auth.register'), routePath: '' },
  ]);

  const mode = ref<'login' | 'register'>('login');
  const email = ref('');
  const password = ref('');
  const passwordConfirm = ref('');
  const acceptedPrivacy = ref(false);
  const submitting = ref(false);
  const message = ref('');
  const isError = ref(false);
  const showReset = ref(false);
  const showMfaVerify = ref(false);

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

  function handleTabChange(newId: string) {
    mode.value = newId as 'login' | 'register';
    clearAllErrors();
    message.value = '';
    isError.value = false;
    passwordConfirm.value = '';
    acceptedPrivacy.value = false;
    if (showMfaVerify.value) {
      cancelMfaLogin();
      showMfaVerify.value = false;
    }
  }

  function openReset() {
    showReset.value = true;
  }

  function onResetSuccess() {
    message.value = 'Passwort erfolgreich zurückgesetzt. Bitte einloggen.';
    isError.value = false;
    showReset.value = false;
    mode.value = 'login';
  }

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
      errors.password =
        mode.value === 'login'
          ? t('account.auth.errors.passwordShort')
          : t('account.auth.errors.newShort');
      ok = false;
    }

    if (mode.value === 'register') {
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
    }

    return ok;
  }

  async function submit() {
    if (showMfaVerify.value) return;
    message.value = '';
    isError.value = false;

    if (!validateBeforeSubmit()) {
      return;
    }

    submitting.value = true;
    try {
      if (mode.value === 'register') {
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
      } else {
        const { data } = await hw.post('/api/auth/login', {
          email: email.value,
          password: password.value,
        });
        if (data.ok) {
          if (data.requiresMfa) {
            showMfaVerify.value = true;
          } else {
            // The backend already set/rotated the CSRF cookie via Set-Cookie.
            // The Axios interceptor reads it fresh on every request — no manual sync needed.
            onLoggedIn();
          }
        }
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.value = err.response?.data?.error || t('global.errors.unknown');
      isError.value = true;
    } finally {
      submitting.value = false;
    }
  }

  function onMfaVerified() {
    showMfaVerify.value = false;
    resetMfaState();
    onLoggedIn();
  }

  function onMfaCancelled() {
    showMfaVerify.value = false;
    resetMfaState();
    message.value = 'Anmeldung abgebrochen.';
    isError.value = true;
  }

  const enter = (el: Element) => {
    const e = el as HTMLElement;
    const height = e.scrollHeight;
    e.style.cssText =
      'height:0;opacity:0;margin-top:0;margin-bottom:0;overflow:hidden';
    e.offsetHeight;
    e.style.transition =
      'height 0.3s cubic-bezier(0.78,0,0.22,1),opacity 0.3s cubic-bezier(0.78,0,0.22,1),margin 0.3s cubic-bezier(0.78,0,0.22,1)';
    e.style.height = height + 'px';
    e.style.opacity = '1';
    e.style.marginTop = '';
    e.style.marginBottom = '';
  };

  const afterEnter = (el: Element) => {
    const e = el as HTMLElement;
    e.style.height = 'auto';
    e.style.overflow = '';
    e.style.transition = '';
  };

  const leave = (el: Element) => {
    const e = el as HTMLElement;
    e.style.height = e.scrollHeight + 'px';
    e.style.overflow = 'hidden';
    e.offsetHeight;
    e.style.transition =
      'height 0.3s cubic-bezier(0.78,0,0.22,1),opacity 0.3s cubic-bezier(0.78,0,0.22,1),margin 0.3s cubic-bezier(0.78,0,0.22,1)';
    e.style.height = '0';
    e.style.opacity = '0';
    e.style.marginTop = '0';
    e.style.marginBottom = '0';
  };

  return {
    tabs,
    mode,
    email,
    password,
    passwordConfirm,
    acceptedPrivacy,
    submitting,
    message,
    isError,
    showReset,
    showMfaVerify,
    emailInputRef,
    errors,
    handleTabChange,
    openReset,
    onResetSuccess,
    clearFieldError,
    submit,
    onMfaVerified,
    onMfaCancelled,
    enter,
    afterEnter,
    leave,
  };
}
