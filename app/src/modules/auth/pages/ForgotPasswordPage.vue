<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import hw from '../../../api/api';
import { useToast } from '@/common/composables/useToast';
import CenteredAuthModal from '@/common/components/CenteredAuthModal.vue';

const router = useRouter();
const { t } = useI18n();

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
    goBackToLogin();
  }
  if (e.key === 'Enter' && !submitting.value) {
    handleNext();
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

function goBack() {
  if (step.value === 2) {
    step.value = 1;
    setMessage('');
    code.value = '';
  }
}

function goBackToLogin() {
  router.push('/login');
}

async function handleNext() {
  setMessage('');
  if (step.value === 1) {
    if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      setMessage(t('auth.login.reset.errors.invalid_email'), true);
      return;
    }
    submitting.value = true;
    try {
      await hw.post('/auth/forgot', { email: email.value });
      setMessage(t('auth.login.reset.errors.code_sent'), false);
      step.value = 2;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(
        err?.response?.data?.error ||
          t('auth.login.reset.errors.request_failed'),
        true,
      );
    } finally {
      submitting.value = false;
    }
  } else if (step.value === 2) {
    if (!code.value || code.value.trim().length !== 6) {
      setMessage(t('auth.login.reset.errors.invalid_code'), true);
      return;
    }
    submitting.value = true;
    try {
      const { data } = await hw.post('/auth/reset/verify', {
        email: email.value,
        code: code.value.trim(),
      });
      savedResetToken = data.resetToken;
      setMessage(t('auth.login.reset.errors.code_verified'), false);
      step.value = 3;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(
        err?.response?.data?.error ||
          t('auth.login.reset.errors.code_expired'),
        true,
      );
    } finally {
      submitting.value = false;
    }
  } else if (step.value === 3) {
    if (!password.value || password.value.length < 8) {
      setMessage(t('auth.login.reset.errors.password_short'), true);
      return;
    }
    if (password.value !== password2.value) {
      setMessage(t('auth.login.reset.errors.password_mismatch'), true);
      return;
    }
    if (!savedResetToken) {
      setMessage(t('auth.login.reset.errors.no_token'), true);
      step.value = 1;
      return;
    }
    submitting.value = true;
    try {
      const { data } = await hw.post('/auth/reset', {
        resetToken: savedResetToken,
        password: password.value,
      });
      const msg = data.message || t('auth.login.reset_success');
      useToast().success(msg);
      await router.push('/login');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setMessage(
        err?.response?.data?.error ||
          t('auth.login.reset.errors.reset_failed'),
        true,
      );
    } finally {
      submitting.value = false;
    }
  }
}
</script>

<template>
  <div class="flex items-center justify-center px-4 py-6">
    <CenteredAuthModal
      :title="
        step === 1
          ? t('auth.login.reset.title')
          : step === 2
            ? t('auth.login.reset.step2.title', {
                defaultValue: 'Verify Code',
              })
            : t('auth.login.reset.step3.title', {
                defaultValue: 'New Password',
              })
      "
      :close-on-backdrop="false"
      @close="goBackToLogin"
    >
      <div v-if="step === 1" class="space-y-4">
        <p class="text-sm text-on-ghost-muted">
          {{ t('auth.login.reset.step1.description') }}
        </p>
        <div>
          <label
            for="reset-email"
            class="block text-base font-medium text-on-ghost mb-2"
          >
            {{ t('auth.login.email') }}
          </label>
          <BaseInput
            id="reset-email"
            ref="emailInputRef"
            v-model="email"
            :placeholder="t('auth.login.reset.placeholders.email')"
            type="email"
            required
          />
        </div>
      </div>
      <div v-else-if="step === 2" class="space-y-4">
        <p class="text-sm text-on-ghost-muted">
          {{ t('auth.login.reset.step2.description') }}
        </p>
        <div>
          <label
            for="reset-code"
            class="block text-base font-medium text-on-ghost mb-2"
          >
            {{ t('auth.login.reset.placeholders.code') }}
          </label>
          <BaseInput
            id="reset-code"
            ref="codeInputRef"
            v-model="code"
            :placeholder="t('auth.login.reset.placeholders.code')"
            required
          />
        </div>
      </div>
      <div v-else-if="step === 3" class="space-y-4">
        <p class="text-sm text-on-ghost-muted">
          {{ t('auth.login.reset.step3.description') }}
        </p>
        <div>
          <label
            for="reset-password"
            class="block text-base font-medium text-on-ghost mb-2"
          >
            {{ t('auth.login.reset.placeholders.new_password') }}
          </label>
          <BaseInput
            id="reset-password"
            ref="passwordInputRef"
            v-model="password"
            :placeholder="t('auth.login.reset.placeholders.new_password')"
            type="password"
            required
          />
        </div>
        <div>
          <label
            for="reset-password-confirm"
            class="block text-base font-medium text-on-ghost mb-2"
          >
            {{ t('auth.login.reset.placeholders.confirm_password') }}
          </label>
          <BaseInput
            id="reset-password-confirm"
            v-model="password2"
            :placeholder="t('auth.login.reset.placeholders.confirm_password')"
            type="password"
            required
          />
        </div>
      </div>
      <Transition name="fade">
        <div
          v-if="message"
          class="text-sm p-3 rounded-md mt-4"
          :class="
            isError
              ? 'bg-danger-hover text-danger'
              : 'bg-success-hover text-success'
          "
        >
          {{ message }}
        </div>
      </Transition>
      <template #actions>
        <BaseButton type="button" variant="ghost" @click="goBackToLogin">
          {{ t('common.buttons.cancel') }}
        </BaseButton>
        <BaseButton
          v-if="step === 2"
          type="button"
          variant="ghost"
          @click="goBack"
          :disabled="submitting"
        >
          {{ t('common.buttons.back') }}
        </BaseButton>
        <BaseButton
          type="button"
          variant="action"
          @click="handleNext"
          :disabled="submitting"
          :loading="submitting"
        >
          {{
            step === 1
              ? t('auth.login.reset.actions.request_code')
              : step === 2
                ? t('auth.login.reset.actions.verify_code')
                : t('auth.login.reset.actions.set_password')
          }}
        </BaseButton>
      </template>
    </CenteredAuthModal>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
