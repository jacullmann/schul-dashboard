<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';
import { useOAuth } from '@/modules/auth/composables/useOAuth';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'linked'): void;
  (e: 'cancel'): void;
}>();

const { linkGoogleAccount } = useOAuth();

const password = ref('');
const submitting = ref(false);
const errorMsg = ref('');

async function submit() {
  if (!password.value || submitting.value) return;
  submitting.value = true;
  errorMsg.value = '';

  const result = await linkGoogleAccount(password.value);

  submitting.value = false;

  if (result.ok) {
    emit('linked');
  } else {
    errorMsg.value = result.error;
  }
}

function cancel() {
  emit('cancel');
}
</script>

<template>
  <BaseModal
    :open="open"
    :submit="submit"
    :loading="submitting"
    :error="errorMsg"
    :requirement="password"
    @cancel="cancel"
  >
    <template #title>{{ t('auth.google_link.title') }}</template>

    <template #content>
      <div class="flex flex-col items-center gap-3 mb-4">
        <div
          class="w-12 h-12 rounded-xl bg-surface border border-ghost-border flex items-center justify-center"
          aria-hidden="true"
        >
          <GoogleIcon :size="24" />
        </div>
      </div>

      <p class="m-0 mb-4 text-sm/relaxed text-on-ghost-muted text-center">
        Ein Konto mit dieser E-Mail-Adresse existiert bereits. Gib dein Passwort
        {{ t('auth.google_link.description') }}
      </p>

      <BaseFormGroup id="link-password">
        <BaseLabel for="link-password">{{
          t('auth.login.password')
        }}</BaseLabel>
        <BaseInput
          id="link-password"
          v-model="password"
          type="password"
          :placeholder="t('auth.login.password')"
          autocomplete="current-password"
          autofocus
          @input="errorMsg = ''"
        />
      </BaseFormGroup>
    </template>

    <template #action-text>
      {{ t('auth.connected_accounts.actions.link') }}
    </template>
  </BaseModal>
</template>
