<script setup lang="ts">
import { ref } from 'vue';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';
import { useOAuth } from '@/modules/auth/composables/useOAuth';

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
    @cancel="cancel"
    :submit="submit"
    :loading="submitting"
    :error="errorMsg"
    :requirement="password"
  >
    <template #title> Google-Konto verknüpfen </template>

    <template #content>
      <div class="flex flex-col items-center gap-3 mb-4">
        <div
          class="w-12 h-12 rounded-xl bg-surface border border-surface-border flex items-center justify-center"
          aria-hidden="true"
        >
          <GoogleIcon :size="24" />
        </div>
      </div>

      <p
        class="m-0 mb-4 text-sm text-on-ghost-muted leading-[1.5] text-center"
      >
        Ein Konto mit dieser E-Mail-Adresse existiert bereits. Gib dein Passwort
        ein, um Google mit deinem bestehenden Konto zu verknüpfen.
      </p>

      <BaseFormGroup id="link-password">
        <BaseLabel for="link-password">Passwort</BaseLabel>
        <BaseInput
          id="link-password"
          type="password"
          v-model="password"
          placeholder="Dein Passwort"
          autocomplete="current-password"
          autofocus
          @input="errorMsg = ''"
        />
      </BaseFormGroup>
    </template>

    <template #action-text> Verknüpfen </template>
  </BaseModal>
</template>
