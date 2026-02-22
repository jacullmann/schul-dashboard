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
              ref="usernameInputRef"
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
        <Checkbox v-model="accepted" />
        <span class="checkbox-text">Nutzungsbedingungen und Datenschutzerlärungen akzeptieren</span>
      </label>

      <div class="action-area">
        <button
            class="s-btn"
            @click="submit"
            :disabled="!accepted || isLoading"
        >
          <span v-if="!isLoading">Anmelden</span>
          <LoadingSpinner v-else color="white" size="1.2em" />
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
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import GetStatushwb2 from "@/modules/welcome/components/GetStatushwb2.vue";
import { syncCsrfFromCookie, setCsrfToken } from '@/api/hwApi';
import {
  Eye,
  EyeOff,
  User,
  Key,
  ArrowRight,
  AlertCircle
} from 'lucide-vue-next'
import LoadingSpinner from "@/common/components/LoadingSpinner.vue";
import Checkbox from '@/common/components/Checkbox.vue';
import { useUserStore } from "@/stores/userStore";
const userStore = useUserStore();

const router = useRouter();
const auth = useAppAuth();
const password1 = ref('');
const password2 = ref('');
const error = ref<string | null>(null);
const accepted = ref(false)
const showPassword = ref(false);
const isLoading = ref(false);
const showIt = ref(false);
const usernameInputRef = ref<HTMLInputElement | null>(null);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && accepted.value && !isLoading.value) {
    submit();
  }
}

onMounted(() => {
  usernameInputRef.value?.focus();
  window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
});

async function submit() {
  if (!accepted.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const combinedPassword = password1.value.trim() + password2.value.trim();
    const res = await auth.loginWithCode(combinedPassword);

    if (res.ok) {
      if (res.csrfToken) {
        setCsrfToken(res.csrfToken);
      } else {
        syncCsrfFromCookie();
      }
      try {
        await userStore.fetchUser();
      } catch {
      }
      await router.push('/items/HAUSAUFGABE');
    } else {
      error.value = res.error || 'Zugriff verweigert. Code prüfen.';
    }
  } catch (e: any) {
    if (e.response?.data?.error) {
      error.value = e.response.data.error;
    } else if (e.name === 'NavigationDuplicated') {
      return;
    } else {
      error.value = "Verbindungsfehler. Bitte erneut versuchen.";
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-card {
  width: 480px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  overflow: hidden;
}


.card-header {
  text-align: center;
}

.card-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text);
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
  color: var(--sub);
  z-index: 10;
  pointer-events: none;
  transition: color 0.2s;
}

.s-input {
  width: 100%;
  background: var(--vlbg);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 10px 12px 10px 42px;
  color: var(--text);
  font-size: 1rem;
}

.s-input:focus {
  outline: none;
}

.s-input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  color: var(--sub);
}
.s-input.input-focus {
  border-color: var(--border2);
}
.s-input.input-focus + .input-icon {
  color: var(--sub);
}


.visibility-toggle {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: var(--sub);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.visibility-toggle:hover { color: var(--text); }


.s-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin: 8px 0 16px 0;
  user-select: none;
}

.checkbox-text {
  font-size: 0.9rem;
  color: var(--text);
}


.s-btn {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  color: var(--bg);
  background: var(--text);
  border: 1px solid var(--text);
}

.s-btn:hover {
  background: var(--sub);
  border-color: var(--sub);
}

.s-btn:disabled {
  cursor: not-allowed;
  background: var(--sub);
  border-color: var(--sub);
}

.card-footer {
  margin-top: 0;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  text-align: center;
}

.status-line {
  font-size: 0.8rem;
  color: var(--text);
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}

.disclaimer {
  font-size: 0.8rem;
  color: var(--sub);
  margin: 0;
  line-height: 1.4;
}

.link-subtle:hover {
  color: var(--text);
  text-decoration: underline;
}

.error-banner {
  margin-top: 16px;
  background: var(--special--red--background);
  border: 1px solid var(--special--red--background);
  color: var(--special--red);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>