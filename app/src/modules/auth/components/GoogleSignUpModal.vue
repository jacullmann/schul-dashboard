<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';
import TermsConsentCheckbox from '@/modules/auth/components/TermsConsentCheckbox.vue';
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

const acceptedTerms = ref(false);
const submitting = ref(false);
const errorMsg = ref('');

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    acceptedTerms.value = false;
    errorMsg.value = '';
  },
);

async function submit() {
  if (!acceptedTerms.value || submitting.value) return;
  submitting.value = true;
  errorMsg.value = '';

  const result = await signUpWithGoogle();

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
    @cancel="emit('cancel')"
  >
    <template #title>{{ t('auth.google_signup.title') }}</template>

    <template #content>
      <div class="flex flex-col items-center gap-3 mb-4">
        <div
          class="w-12 h-12 rounded-xl bg-surface border border-ghost-border flex items-center justify-center"
          aria-hidden="true"
        >
          <GoogleIcon :size="24" />
        </div>
      </div>

      <div class="mb-4 text-sm/relaxed text-on-ghost-muted text-center">
        {{ t('auth.google_signup.description') }}
      </div>

      <TermsConsentCheckbox v-model="acceptedTerms" />
    </template>

    <template #action-text>
      {{ t('auth.google_signup.action') }}
    </template>
  </BaseModal>
</template>
