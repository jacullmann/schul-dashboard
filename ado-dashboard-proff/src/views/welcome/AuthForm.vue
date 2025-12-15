<template>
  <div class="login-card">
    <div class="card-header">
      <h2 class="card-title">Authentifizierung</h2>
    </div>

    <div class="card-body">
      <div class="input-group">
        <label class="sr-only" for="username">Name</label>
        <div class="input-wrapper">
          <component :is="User" class="input-icon" :size="18" />
          <input
              id="username"
              v-model="password1"
              placeholder="Name"
              class="s-input"
              type="text"
              autocomplete="username"
              :class="{ 'input-focus': password1 }"
          />
        </div>
      </div>

      <div class="input-group">
        <label class="sr-only" for="access-code">Zugangscode</label>
        <div class="input-wrapper">
          <component :is="Key" class="input-icon" :size="18" />
          <input
              id="access-code"
              v-model="password2"
              placeholder="Zugangscode"
              class="s-input"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              :class="{ 'input-focus': password2 }"
          />
          <button
              type="button"
              @click="showPassword = !showPassword"
              class="visibility-toggle"
              aria-label="Passwort anzeigen"
          >
            <component :is="showPassword ? EyeOff : Eye" :size="18" />
          </button>
        </div>
      </div>

      <label class="s-checkbox">
        <input class="checkbox-input" type="checkbox" v-model="accepted" />
        <span class="checkbox-box">
          <component :is="Check" class="check-icon" :size="12" />
        </span>
        <span class="checkbox-text">Nutzungsbedingungen akzeptieren</span>
      </label>

      <div class="action-area">
        <button
            class="s-btn btn ghost"
            @click="submit"
            :disabled="!accepted || isLoading"
        >
          <span v-if="!isLoading">Anmelden</span>
          <span v-else class="loading-spinner"></span>
          <component v-if="!isLoading" :is="ArrowRight" :size="18" />
        </button>
      </div>

      <transition name="fade">
        <div v-if="error" class="error-banner">
          <component :is="AlertCircle" :size="16" />
          {{ error }}
        </div>
      </transition>
    </div>

    <div class="card-footer">
      <div class="status-line">
        <GetStatushwb2 />
      </div>
      <p  @click="showIt = false" v-if="showIt" class="disclaimer">
        Jeder unbefugte Versuch, die Sicherheitsvorkehrungen zu umgehen oder sensitive Daten (inklusive personenbezogener Daten) zu erlangen oder zu kompromittieren, wird lückenlos dokumentiert.

        Derartige Verstöße werden ausnahmslos und unverzüglich zur Strafanzeige gebracht, unabhängig davon, ob der Versuch erfolgreich war oder ob Daten tatsächlich erlangt wurden.
      </p>
      <p style="cursor: pointer" v-else @click="showIt = true" class="disclaimer link-subtle">
        Wichtiger rechtlicher Hinweis!
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';
import GetStatushwb2 from "./GetStatushwb2.vue";
import {
  Eye,
  EyeOff,
  User,
  Key,
  ArrowRight,
  Check,
  AlertCircle
} from 'lucide-vue-next'

const router = useRouter();
const auth = useAuth();
const password1 = ref('');
const password2 = ref('');
const error = ref<string | null>(null);
const accepted = ref(false)
const showPassword = ref(false);
const isLoading = ref(false);
const showIt = ref(false);

async function submit() {
  if (!accepted.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const combinedPassword = password1.value.trim() + password2.value.trim();
    const res = await auth.loginWithCode(combinedPassword);

    if (res.ok) {
      auth.refreshExpiry();
      umami.track('Welcome Page Login erfolgreich');
      await  router.push('/items/HAUSAUFGABE');
    } else {
      error.value = res.error || 'Zugriff verweigert. Code prüfen.';
    }
  } catch (e) {
    error.value = "Verbindungsfehler.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-card {
  background: var(--card);
  border-radius: 12px;
  padding: 30px;
  width: 410px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--start--border);
}


.card-header {
  text-align: center;
}

.card-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--start--text);
  margin: 0;
  letter-spacing: -0.01em;
}
.input-group {
  margin-bottom: 16px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: var(--start--sub);
  z-index: 10;
  pointer-events: none;
  transition: color 0.2s;
}

.s-input {
  width: 100%;
  background: var(--start--bg);
  border: 1px solid var(--start--border2);
  border-radius: 8px;
  padding: 12px 16px 12px 42px;
  color: var(--start--text);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.s-input:focus {
  outline: none;
  border-color: var(--start--sub);
}

.s-input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  color: var(--start--sub);
}
.s-input.input-focus {
  border-color: var(--start--border2);
}
.s-input.input-focus + .input-icon {
  color: var(--start--sub);
}


.visibility-toggle {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--start--sub);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.visibility-toggle:hover { color: var(--start--text); }


.s-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  margin: 8px 0 24px 0;
  user-select: none;
}

.checkbox-input {
  display: none;
}

.checkbox-box {
  width: 20px;
  height: 20px;
  border: 2px solid var(--start--border2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  background: transparent;
}

.check-icon {
  color: var(--card);
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.checkbox-input:checked + .checkbox-box {
  background: var(--start--sub);
  border-color: var(--start--sub);
}

.checkbox-input:checked + .checkbox-box .check-icon {
  opacity: 1;
  transform: scale(1);
  color: var(--card);
}

.checkbox-text {
  font-size: 0.9rem;
  color: var(--start--sub);
}


.s-btn {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;
  border: 1px solid #555555;
}

.s-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--start--border2);
  border-color: var(--start--border);
}
.s-btn:disabled:hover {
  background: var(--start--border2);
  color: white;
}

.card-footer {
  margin-top: 0;
  padding-top: 20px;
  border-top: 1px solid var(--start--border);
  text-align: center;
}

.status-line {
  font-size: 0.8rem;
  color: var(--start--text);
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}

.disclaimer {
  font-size: 0.75rem;
  color: var(--start--sub);
  margin: 0;
  line-height: 1.4;
}

.link-subtle:hover {
  color: var(--start--text);
  text-decoration: underline;
}

/* ERROR BANNER */
.error-banner {
  margin-top: 16px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--start--text);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* TRANSITION */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .login-card {
    padding: 20px;
  }

}
</style>