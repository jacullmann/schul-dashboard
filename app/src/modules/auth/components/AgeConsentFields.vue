<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  idPrefix: string;
  needsGuardianConsent: boolean;
  birthYearError?: string;
  guardianConsentError?: string;
}>();

const birthYear = defineModel<string | number | null>('birthYear', {
  required: true,
});
const guardianConsent = defineModel<boolean>('guardianConsent', {
  required: true,
});

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-4">
    <BaseFormGroup :id="`${idPrefix}-birth-year`" :error="birthYearError">
      <BaseLabel :for="`${idPrefix}-birth-year`">
        {{ t('auth.age.birth_year') }}
      </BaseLabel>
      <BaseInput
        :id="`${idPrefix}-birth-year`"
        v-model="birthYear"
        type="number"
        inputmode="numeric"
        autocomplete="bday-year"
        required
        :placeholder="t('auth.age.birth_year_placeholder')"
        :aria-describedby="
          birthYearError ? `${idPrefix}-birth-year-error` : undefined
        "
      />
    </BaseFormGroup>

    <BaseFormGroup
      v-if="needsGuardianConsent"
      :id="`${idPrefix}-guardian-consent`"
      :error="guardianConsentError"
    >
      <BaseCheckbox
        v-model="guardianConsent"
        class="mt-1"
        :aria-describedby="
          guardianConsentError
            ? `${idPrefix}-guardian-consent-error`
            : undefined
        "
      >
        {{ t('auth.age.guardian_consent') }}
      </BaseCheckbox>
    </BaseFormGroup>
  </div>
</template>
