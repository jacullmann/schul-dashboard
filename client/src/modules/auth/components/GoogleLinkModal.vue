<script setup lang="ts">
import { ref } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';
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
  <div class="blurit" @click.self="cancel" aria-hidden="true">
    <div class="link-card" role="dialog" aria-modal="true" aria-labelledby="link-modal-title">

      <div class="link-header">
        <div class="google-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
          </svg>
        </div>
        <h3 id="link-modal-title" class="link-title">Google-Konto verknüpfen</h3>
      </div>

      <p class="link-description">
        Ein Konto mit dieser E-Mail-Adresse existiert bereits.
        Gib dein Passwort ein, um Google mit deinem bestehenden Konto zu verknüpfen.
      </p>

      <form @submit.prevent="submit" class="link-form" novalidate>
        <div class="form-group">
          <label for="link-password">Passwort</label>
          <div class="input-wrapper">
            <input
                id="link-password"
                class="input"
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

      <div class="link-actions">
        <button type="button" class="btn ghost" @click="cancel" :disabled="submitting">
          Abbrechen
        </button>
        <button
            type="submit"
            form="link-form"
            class="btn action"
            :disabled="!password || submitting"
            @click="submit"
        >
          <LoadingSpinner v-if="submitting" color="white" size="1.2em" />
          <span v-else>Verknüpfen</span>
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.link-card {
  position: fixed;
  inset: 0;
  margin: auto;
  width: 100%;
  max-width: 400px;
  height: fit-content;
  background: var(--bg-canvas);
  border: 1px solid var(--border-canvas);
  border-radius: var(--border-radius-xl);
  padding: 24px;
  box-shadow: var(--menu-shadow);
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 200;
}

.link-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.google-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.link-title {
  margin: 0;
  font-size: var(--font-size-h3);
  font-weight: 700;
  color: var(--text-default);
  text-align: center;
}

.link-description {
  margin: 0;
  font-size: var(--font-size-sub);
  color: var(--sub);
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
  font-size: var(--font-size-sub);
  font-weight: 500;
  color: var(--text-default);
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
  color: var(--sub);
  display: flex;
  align-items: center;
  transition: color 0.1s ease;
}

.password-toggle:hover {
  color: var(--text-default);
}

.error-msg {
  font-size: var(--font-size-sub);
  color: var(--danger);
  margin-top: 4px;
}

.link-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.link-actions .btn {
  min-width: 96px;
  justify-content: center;
}
</style>
