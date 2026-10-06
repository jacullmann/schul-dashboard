<script setup lang="ts">
import { useTemplateRef, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import CenteredAuthModal from '@/common/components/CenteredAuthModal.vue';
import { useMfa } from '@/modules/auth/composables/useMfa';
import { useMfaVerify } from '@/modules/auth/composables/useMfaVerify';

const emit = defineEmits<{
  verified: [];
  cancelled: [];
  expired: [];
}>();

const { t } = useI18n();
const { cancelMfaLogin } = useMfa();

const { code, submitting, error, codeComplete, submit, clearError } =
  useMfaVerify({
    onVerified: () => emit('verified'),
    onExpired: () => emit('expired'),
  });

const codeInput = useTemplateRef<{ focus: () => void }>('codeInput');
onMounted(() => codeInput.value?.focus());

async function cancel() {
  if (submitting.value) return;
  await cancelMfaLogin();
  emit('cancelled');
}
</script>

<template>
  <CenteredAuthModal
    :title="t('auth.mfa.verify.title')"
    :close-on-backdrop="false"
    @close="cancel"
  >
    <BaseForm
      :submit="submit"
      :cancel="cancel"
      :error="error"
      :loading="submitting"
      :requirement="codeComplete"
    >
      <template #content>
        <p class="m-0! mb-4!">
          {{ t('auth.mfa.verify.instruction') }}
        </p>
        <!-- Authenticator codes are typed or pasted in one go, so a complete
             code submits without an extra click. -->
        <BaseCodeInput
          id="mfa-code"
          ref="codeInput"
          v-model="code"
          :aria-label="t('auth.mfa.verify.code')"
          :invalid="!!error"
          @input="clearError"
          @complete="submit"
        />
        <p class="m-0! mt-4! text-sm! text-on-ghost-muted">
          {{ t('auth.mfa.verify.support.text') }}
          <a
            href="mailto:kontakt@schul-dashboard.com"
            class="text-on-ghost underline hover:opacity-75 transition-opacity"
          >
            {{ t('auth.mfa.verify.support.link') }}
          </a>
        </p>
      </template>
    </BaseForm>
  </CenteredAuthModal>
</template>
