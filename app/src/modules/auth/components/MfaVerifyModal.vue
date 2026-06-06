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
      error.value = t('auth.mfa.verify.errors.session_expired');
      setTimeout(() => emit('cancelled'), 2000);
    } else {
      error.value = result.error || t('auth.mfa.verify.errors.failed');
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
    :title="t('auth.mfa.verify.title')"
    :close-on-backdrop="false"
    @close="cancel"
  >
    <div class="space-y-4">
      <p class="text-sm text-on-ghost-muted text-center">
        {{ t('auth.mfa.verify.instruction') }}
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
          class="w-[180px] px-4 py-3 text-xl font-mono text-center bg-surface text-on-ghost border-2 border-surface-border rounded-lg outline-none shadow-input transition-all focus:border-focus focus:shadow-focus-ring disabled:opacity-60 disabled:cursor-not-allowed"
          :class="[
            { '!border-danger': error },
            shakeInput ? 'animate-[shake_0.4s_ease-in-out]' : '',
          ]"
          :disabled="loading"
          @input="handleInput"
          @keyup.enter="verify"
        />
      </div>

      <Transition name="fade">
        <div
          v-if="error"
          class="flex items-center justify-center gap-2 text-danger text-sm"
        >
          <AlertCircle :size="16" />
          {{ error }}
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="attemptsRemaining !== null && attemptsRemaining <= 3"
          class="flex items-center justify-center gap-2 text-danger text-sm"
        >
          <AlertTriangle :size="16" />
          {{
            attemptsRemaining === 0
              ? t('auth.mfa.verify.attempts_remaining_none')
              : attemptsRemaining === 1
                ? t('auth.mfa.verify.attempts_remaining_one', { n: 1 })
                : t('auth.mfa.verify.attempts_remaining_other', {
                    n: attemptsRemaining,
                  })
          }}
        </div>
      </Transition>

      <div class="pt-4 border-t border-canvas-border">
        <p class="text-xs/relaxed text-on-ghost-muted text-center m-0">
          {{ t('auth.mfa.verify.support.text') }}
          <br />
          <a
            href="mailto:kontakt@schul-dashboard.com"
            class="text-on-ghost underline hover:opacity-75 transition-opacity"
          >
            {{ t('auth.mfa.verify.support.link') }}
          </a>
        </p>
      </div>
    </div>

    <template #actions>
      <BaseButton type="button" variant="ghost" @click="cancel">
        {{ t('common.buttons.cancel') }}
      </BaseButton>
      <BaseButton
        type="button"
        variant="action"
        :disabled="code.length !== 6 || loading"
        :loading="loading"
        @click="verify"
      >
        {{ t('common.buttons.confirm') }}
      </BaseButton>
    </template>
  </CenteredAuthModal>
</template>

<style>
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-8px);
  }
  40%,
  80% {
    transform: translateX(8px);
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
