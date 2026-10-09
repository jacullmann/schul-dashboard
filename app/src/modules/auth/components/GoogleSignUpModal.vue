<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';
import AgeConsentFields from '@/modules/auth/components/AgeConsentFields.vue';
import TermsConsentCheckbox from '@/modules/auth/components/TermsConsentCheckbox.vue';
import { useAgeConsent } from '@/modules/auth/composables/useAgeConsent';
import { useOAuth } from '@/modules/auth/composables/useOAuth';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'signed-up'): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const { signUpWithGoogle } = useOAuth();

const {
  birthYearInput,
  guardianConsent,
  requiresGuardianConsent,
  ageErrors,
  declareAge,
  resetAge,
} = useAgeConsent();

const acceptedTerms = ref(false);
const submitting = ref(false);
const errorMsg = ref('');

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    acceptedTerms.value = false;
    errorMsg.value = '';
    resetAge();
  },
);

async function submit() {
  if (!acceptedTerms.value || submitting.value) return;

  const declaration = declareAge();
  if (declaration === null) return;

  submitting.value = true;
  errorMsg.value = '';

  const result = await signUpWithGoogle(declaration);

  submitting.value = false;

  if (result.ok) {
    emit('signed-up');
  } else {
    errorMsg.value = result.error;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :submit="submit"
    :loading="submitting"
    :error="errorMsg"
    :requirement="acceptedTerms"
    :close-button="false"
    @cancel="emit('cancel')"
  >
    <template #title>{{ t('auth.google_signup.title') }}</template>

    <template #content>
      <div class="flex flex-col items-center my-4">
        <GoogleIcon :size="40" />
      </div>

      <div class="text-sm text-on-ghost-muted">
        {{ t('auth.google_signup.description') }}
      </div>

      <AgeConsentFields
        v-model:birth-year="birthYearInput"
        v-model:guardian-consent="guardianConsent"
        id-prefix="google-signup"
        :needs-guardian-consent="requiresGuardianConsent"
        :birth-year-error="ageErrors.birthYear"
        :guardian-consent-error="ageErrors.guardianConsent"
      />

      <TermsConsentCheckbox v-model="acceptedTerms" class="mt-4 mb-4" />
    </template>

    <template #action-text>
      {{ t('auth.google_signup.action') }}
    </template>
  </BaseModal>
</template>
