<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import hw from '@/api/hwApi';
import { useToast } from '@/common/composables/useToast';

const { t } = useI18n();

const emit = defineEmits(['cancel', 'success']);

const step = ref(1);
const email = ref('');
const code = ref('');
const password = ref('');
const password2 = ref('');
const submitting = ref(false);
const message = ref('');
const isError = ref(false);
let savedResetToken = '';

const emailInputRef = ref<HTMLInputElement | null>(null);
const codeInputRef = ref<HTMLInputElement | null>(null);
const passwordInputRef = ref<HTMLInputElement | null>(null);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !submitting.value) {
    emit('cancel');
  }
  if (e.key === 'Enter' && !submitting.value) {
    onPrimary();
  }
}

watch(step, async () => {
  await nextTick();
  if (step.value === 1) emailInputRef.value?.focus();
  if (step.value === 2) codeInputRef.value?.focus();
  if (step.value === 3) passwordInputRef.value?.focus();
});

useEventListener(window, 'keydown', onKeyDown);

onMounted(() => {
  emailInputRef.value?.focus();
});

function setMessage(txt: string, error = false) {
  message.value = txt;
  isError.value = error;
}

function onBack() {
  if (step.value === 2) {
    step.value = 1;
    setMessage('');
    code.value = '';
  }
}

async function onPrimary() {
  setMessage('');
  if (step.value === 1) {
    if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      setMessage(t('account.auth.reset.errors.invalidEmail'), true);
      return;
    }
    submitting.value = true;
    try {
      await hw.post('/api/auth/forgot', { email: email.value });
      setMessage(t('account.auth.reset.errors.codeSent'), false);
      step.value = 2;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err?.response?.data?.error || t('account.auth.reset.errors.requestFailed'), true);
    } finally {
      submitting.value = false;
    }
  } else if (step.value === 2) {
    if (!code.value || code.value.trim().length !== 6) {
      setMessage(t('account.auth.reset.errors.invalidCode'), true);
      return;
    }
    submitting.value = true;
    try {
      const { data } = await hw.post('/api/auth/reset/verify', { email: email.value, code: code.value.trim() });
      savedResetToken = data.resetToken;
      setMessage(t('account.auth.reset.errors.codeVerified'), false);
      step.value = 3;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err?.response?.data?.error || t('account.auth.reset.errors.codeExpired'), true);
    } finally {
      submitting.value = false;
    }
  } else if (step.value === 3) {
    if (!password.value || password.value.length < 8) {
      setMessage(t('account.auth.reset.errors.passwordShort'), true);
      return;
    }
    if (password.value !== password2.value) {
      setMessage(t('account.auth.reset.errors.passwordMismatch'), true);
      return;
    }
    if (!savedResetToken) {
      setMessage(t('account.auth.reset.errors.noToken'), true);
      step.value = 1;
      return;
    }
    submitting.value = true;
    try {
      const { data } = await hw.post('/api/auth/reset', { resetToken: savedResetToken, password: password.value });
      const msg = data.message || t('account.auth.resetSuccess');
      useToast().success(msg);
      emit('success');
      emit('cancel');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(err?.response?.data?.error || t('account.auth.reset.errors.resetFailed'), true);
    } finally {
      submitting.value = false;
    }
  }
}
</script>

<template>
  <BaseModal @cancel="emit('cancel')" :submit="onPrimary" :loading="submitting" :error="message">
    <template #title>
      {{ t('account.auth.reset.title') }}
    </template>

    <template #content>
      <div v-if="step === 1">
        <p>{{ t('account.auth.reset.step1.description') }}</p>
        <BaseInput
          id="reset-email"
          ref="emailInputRef"
          v-model="email"
          :placeholder="t('account.auth.reset.placeholders.email')"
        />
      </div>

      <div v-else-if="step === 2">
        <p>{{ t('account.auth.reset.step2.description') }}</p>
        <div class="flex gap-2 mt-2">
          <BaseInput
            id="reset-code"
            ref="codeInputRef"
            v-model="code"
            :placeholder="t('account.auth.reset.placeholders.code')"
          />
          <BaseButton
            @click="onBack"
            :disabled="submitting"
            variant="ghost"
          >
            {{ t('global.buttons.back') }}
          </BaseButton>
        </div>
      </div>

      <div v-else-if="step === 3">
        <p>{{ t('account.auth.reset.step3.description') }}</p>

        <BaseFormGroup id="reset-password">
          <BaseInput
            id="reset-password"
            ref="passwordInputRef"
            type="password"
            v-model="password"
            :placeholder="t('account.auth.reset.placeholders.newPassword')"
          />
        </BaseFormGroup>

        <BaseFormGroup id="reset-password-confirm">
          <BaseInput
            id="reset-password-confirm"
            type="password"
            v-model="password2"
            :placeholder="t('account.auth.reset.placeholders.confirmPassword')"
          />
        </BaseFormGroup>
      </div>

      <div v-if="message && !isError" class="text-sub mt-2">{{ message }}</div>
    </template>

    <template #action-text>
        {{
          step === 1
            ? t('account.auth.reset.actions.requestCode')
            : step === 2
              ? t('account.auth.reset.actions.verifyCode')
              : t('account.auth.reset.actions.setPassword')
        }}
    </template>
  </BaseModal>
</template>
