import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  birthYearIssue,
  needsGuardianConsent,
  type AgeDeclaration,
  type BirthYearIssue,
} from '@/modules/auth/utils/age';

const BIRTH_YEAR_MESSAGES: Record<BirthYearIssue, string> = {
  missing: 'auth.age.errors.birth_year_missing',
  invalid: 'auth.age.errors.birth_year_invalid',
  too_young: 'auth.age.errors.too_young',
};

type AgeField = 'birthYear' | 'guardianConsent';

export function useAgeConsent() {
  const { t } = useI18n();

  const birthYearInput = ref<string | number | null>(null);
  const guardianConsent = ref(false);
  const errors = reactive<Partial<Record<AgeField, string>>>({});

  const birthYear = computed(() =>
    birthYearInput.value === null || birthYearInput.value === ''
      ? null
      : Number(birthYearInput.value),
  );

  const requiresGuardianConsent = computed(
    () =>
      birthYear.value !== null &&
      needsGuardianConsent(birthYear.value, new Date().getFullYear()),
  );

  watch([birthYearInput, guardianConsent], () => {
    errors.birthYear = undefined;
    errors.guardianConsent = undefined;
  });

  /** The declaration to send, or null when a field needs fixing. */
  function declare(): AgeDeclaration | null {
    const issue = birthYearIssue(birthYear.value, new Date().getFullYear());
    if (issue !== null) {
      errors.birthYear = t(BIRTH_YEAR_MESSAGES[issue]);
      return null;
    }

    if (requiresGuardianConsent.value && !guardianConsent.value) {
      errors.guardianConsent = t('auth.age.errors.guardian_consent_missing');
      return null;
    }

    if (birthYear.value === null) return null;

    return {
      birthYear: birthYear.value,
      guardianConsent: requiresGuardianConsent.value,
    };
  }

  function reset() {
    birthYearInput.value = null;
    guardianConsent.value = false;
  }

  return {
    birthYearInput,
    guardianConsent,
    requiresGuardianConsent,
    ageErrors: errors,
    declareAge: declare,
    resetAge: reset,
  };
}
