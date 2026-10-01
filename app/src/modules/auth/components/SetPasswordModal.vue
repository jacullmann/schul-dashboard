<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSetPassword } from '@/modules/auth/composables/useSetPassword';

const props = defineProps<{
  open: boolean;
  email: string;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'success'): void;
}>();

const { t } = useI18n();

const {
  step,
  code,
  newPassword,
  newPassword2,
  submitting,
  error,
  errors,
  clearFieldError,
  submit,
  reset,
} = useSetPassword(() => emit('success'));

const codeInputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  (open) => {
    if (open) reset();
  },
);

watch(step, async (current) => {
  if (current !== 'confirm') return;
  await nextTick();
  codeInputRef.value?.focus();
});
</script>

<template>
  <BaseModal
    :open="open"
    :submit="submit"
    :error="error || undefined"
    :loading="submitting"
    @cancel="$emit('cancel')"
  >
    <template #title>
      {{ t('auth.set_password.title') }}
    </template>

    <template #content>
      <p
        v-if="step === 'request'"
        class="m-0 text-sm/relaxed text-on-ghost-muted"
      >
        {{ t('auth.set_password.request_description', { email }) }}
      </p>

      <template v-else>
        <p class="m-0 text-sm/relaxed text-on-ghost-muted">
          {{ t('auth.set_password.code_sent', { email }) }}
        </p>

        <BaseFormGroup id="setPasswordCode" :error="errors.code">
          <BaseLabel for="setPasswordCode">
            {{ t('auth.set_password.code_label') }}
          </BaseLabel>
          <BaseInput
            id="setPasswordCode"
            ref="codeInputRef"
            v-model="code"
            autocomplete="one-time-code"
            :placeholder="t('auth.set_password.code_placeholder')"
            :aria-describedby="
              errors.code ? 'setPasswordCode-error' : undefined
            "
            @input="clearFieldError('code')"
            @keydown.enter="submit"
          />
        </BaseFormGroup>

        <BaseFormGroup id="setPasswordNew" :error="errors.new">
          <BaseLabel for="setPasswordNew">
            {{ t('auth.change_password.new_password') }}
          </BaseLabel>
          <BaseInput
            id="setPasswordNew"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            :placeholder="t('auth.change_password.new_placeholder')"
            :aria-describedby="errors.new ? 'setPasswordNew-error' : undefined"
            @input="clearFieldError('new')"
            @keydown.enter="submit"
          />
        </BaseFormGroup>

        <BaseFormGroup id="setPasswordConfirm" :error="errors.confirm">
          <BaseLabel for="setPasswordConfirm">
            {{ t('auth.change_password.confirm_password') }}
          </BaseLabel>
          <BaseInput
            id="setPasswordConfirm"
            v-model="newPassword2"
            type="password"
            autocomplete="new-password"
            :placeholder="t('auth.change_password.confirm_placeholder')"
            :aria-describedby="
              errors.confirm ? 'setPasswordConfirm-error' : undefined
            "
            @input="clearFieldError('confirm')"
            @keydown.enter="submit"
          />
        </BaseFormGroup>
      </template>
    </template>

    <template #action-text>
      {{
        step === 'request'
          ? t('auth.set_password.send_code')
          : t('auth.set_password.title')
      }}
    </template>
  </BaseModal>
</template>
