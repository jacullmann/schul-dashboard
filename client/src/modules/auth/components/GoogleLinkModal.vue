<script setup lang="ts">
import { ref } from 'vue';
import { Eye, EyeOff } from '@lucide/vue';
import GoogleIcon from '@/modules/auth/components/GoogleIcon.vue';
import { useOAuth } from '@/modules/auth/composables/useOAuth';

const emit = defineEmits<{
  (e: 'linked'): void;
  (e: 'cancel'): void;
}>();

const { linkGoogleAccount } = useOAuth();

const password = ref('');
const showPassword = ref(false);
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
  <BaseModal @cancel="cancel">
    <template #title>
      Google-Konto verknüpfen
    </template>

    <template #content>
      <div class="link-header">
        <div class="google-icon" aria-hidden="true">
          <GoogleIcon :size="24" />
        </div>
      </div>

      <p class="link-description">
        Ein Konto mit dieser E-Mail-Adresse existiert bereits.
        Gib dein Passwort ein, um Google mit deinem bestehenden Konto zu verknüpfen.
      </p>

      <form id="link-form" @submit.prevent="submit" class="link-form" novalidate>
        <div class="form-group">
          <label for="link-password">Passwort</label>
          <div class="input-wrapper">
            <BaseInput
                id="link-password"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                placeholder="Dein Passwort"
                autocomplete="current-password"
                autofocus
                @input="errorMsg = ''"
            />
            <button
                type="button"
                class="password-toggle"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'"
            >
              <component :is="showPassword ? EyeOff : Eye" :size="18" />
            </button>
          </div>
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      </form>
    </template>

    <template #action-btn>
      <BaseButton type="submit" form="link-form" :disabled="!password || submitting" variant="action" :loading="submitting">
        Verknüpfen
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.link-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.google-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.link-description {
  margin: 0 0 16px 0;
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  line-height: 1.5;
  text-align: center;
}

.link-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: var(--text-sub);
  font-weight: 500;
  color: var(--color-on-surface);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--color-on-surface-muted);
  display: flex;
  align-items: center;
  transition: color 0.1s ease;
}

.password-toggle:hover {
  color: var(--color-on-surface);
}

.error-msg {
  font-size: var(--text-sub);
  color: var(--color-danger);
  margin-top: 4px;
}
</style>
