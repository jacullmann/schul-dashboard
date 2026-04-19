<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlertCircle, AlertTriangle } from '@lucide/vue';
import { useMfa } from '@/modules/auth/composables/useMfa';
import CenteredAuthModal from '@/common/components/CenteredAuthModal.vue';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'verified'): void;
  (e: 'cancelled'): void;
}>();

const { verifyMfaLogin, cancelMfaLogin } = useMfa();

const code = ref('');
const error = ref<string | null>(null);
const loading = ref(false);
const shakeInput = ref(false);
const attemptsRemaining = ref<number | null>(null);
const codeInputRef = ref<HTMLInputElement | null>(null);

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement;
  input.value = input.value.replace(/\D/g, '').slice(0, 6);
  code.value = input.value;
  error.value = null;
  if (code.value.length === 6) {
    verify();
  }
}

async function verify() {
  if (code.value.length !== 6 || loading.value) return;

  loading.value = true;
  error.value = null;

  const result = await verifyMfaLogin(code.value);

  if (result.ok) {
    emit('verified');
  } else {
    const isExpired =
      result.error?.includes('expired') || result.error?.includes('abgelaufen');
    if (isExpired) {
      error.value = t('account.mfa.verify.errors.sessionExpired');
      setTimeout(() => emit('cancelled'), 2000);
    } else {
      error.value = result.error || t('account.mfa.verify.errors.failed');
    }
    code.value = '';
    shakeInput.value = true;
    setTimeout(() => {
      shakeInput.value = false;
    }, 500);
    await nextTick();
    codeInputRef.value?.focus();
  }

  loading.value = false;
}

async function cancel() {
  await cancelMfaLogin();
  emit('cancelled');
}

onMounted(() => {
  nextTick(() => {
    codeInputRef.value?.focus();
  });
});
</script>

<template>
  <CenteredAuthModal
    :title="t('account.mfa.verify.title')"
    :close-on-backdrop="false"
    @close="cancel"
  >
    <div class="space-y-4">
      <p class="text-sub text-on-surface-muted text-center">
        {{ t('account.mfa.verify.instruction') }}
      </p>

      <div class="flex justify-center">
        <input
          ref="codeInputRef"
          v-model="code"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          maxlength="6"
          placeholder="000000"
          class="w-[180px] px-4 py-3 text-h3 font-mono text-center bg-surface text-on-surface border-2 border-surface-border rounded-lg outline-none shadow-input transition-all focus:border-focus focus:shadow-focus-ring disabled:opacity-60 disabled:cursor-not-allowed"
          :class="[{ '!border-danger': error }, shakeInput ? 'animate-[shake_0.4s_ease-in-out]' : '']"
          :disabled="loading"
          @input="handleInput"
          @keyup.enter="verify"
        />
      </div>

      <transition name="fade">
        <div
          v-if="error"
          class="flex items-center justify-center gap-2 text-danger text-sub"
        >
          <AlertCircle :size="16" />
          {{ error }}
        </div>
      </transition>

      <transition name="fade">
        <div
          v-if="attemptsRemaining !== null && attemptsRemaining <= 3"
          class="flex items-center justify-center gap-2 text-danger text-sub"
        >
          <AlertTriangle :size="16" />
          {{ t('account.mfa.verify.attemptsRemaining', attemptsRemaining) }}
        </div>
      </transition>

      <div class="pt-4 border-t border-canvas-border">
        <p
          class="text-footnote text-on-surface-muted text-center m-0 leading-relaxed"
        >
          {{ t('account.mfa.verify.support.text') }}
          <br />
          <a
            href="mailto:kontakt@schul-dashboard.com"
            class="text-on-surface underline hover:opacity-75 transition-opacity"
          >
            {{ t('account.mfa.verify.support.link') }}
          </a>
        </p>
      </div>
    </div>

    <template #actions>
      <BaseButton type="button" variant="ghost" @click="cancel">
        {{ t('global.buttons.cancel') }}
      </BaseButton>
      <BaseButton
        type="button"
        variant="action"
        @click="verify"
        :disabled="code.length !== 6 || loading"
        :loading="loading"
      >
        {{ t('global.buttons.confirm') }}
      </BaseButton>
    </template>
  </CenteredAuthModal>
</template>

<style>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
