import { computed, ref } from 'vue';
import { useMfa } from '@/modules/auth/composables/useMfa';

const CODE_PATTERN = /^\d{6}$/;

interface MfaVerifyCallbacks {
  onVerified: () => void;
  onExpired: () => void;
}

export function useMfaVerify({ onVerified, onExpired }: MfaVerifyCallbacks) {
  const { verifyMfaLogin } = useMfa();

  const code = ref('');
  const submitting = ref(false);
  const error = ref('');

  const trimmedCode = computed(() => code.value.trim());
  const codeComplete = computed(() => CODE_PATTERN.test(trimmedCode.value));

  async function submit() {
    if (!codeComplete.value || submitting.value) return;
    submitting.value = true;
    error.value = '';
    try {
      const result = await verifyMfaLogin(trimmedCode.value);
      if (result.ok) {
        onVerified();
      } else if (result.challengeExpired) {
        onExpired();
      } else {
        error.value = result.error ?? '';
        code.value = '';
      }
    } finally {
      submitting.value = false;
    }
  }

  function clearError() {
    error.value = '';
  }

  return {
    code,
    submitting,
    error,
    codeComplete,
    submit,
    clearError,
  };
}
