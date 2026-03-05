<template>
  <div class="login-card">
    <div class="card-header">
      <h2 class="card-title">Authentifizierung</h2>
    </div>

    <form @submit.prevent="submit" class="card-body">
      <div class="input-group">
        <label for="username">{{ t('welcome.auth.name') }}</label>
        <div class="input-wrapper">
          <input
              ref="usernameInputRef"
              id="username"
              v-model="password1"
              placeholder="Name"
              class="input"
              type="text"
              autocomplete="username"
              :class="{ 'input-focus': password1 }"
          />
        </div>
      </div>

      <div class="input-group">
        <label for="access-code">{{ t('welcome.auth.passcode') }}</label>
        <div class="input-wrapper">
          <input
              id="access-code"
              v-model="password2"
              placeholder="Zugangscode"
              class="input"
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
            <component :is="showPassword ? EyeOff : Eye" :size="20" />
          </button>
        </div>
      </div>

      <label class="s-checkbox">
        <Checkbox v-model="accepted" />
        <span class="checkbox-text">{{ t('welcome.auth.terms') }}</span>
      </label>

      <div class="action-area">
        <button
            type="submit"
            class="btn action s-btn"
            :disabled="!accepted || isLoading"
        >
          <span v-if="!isLoading">{{ t('account.auth.login') }}</span>
          <LoadingSpinner v-else color="white" size="1.2em" />
          <component v-if="!isLoading" :is="ArrowRight" :size="16" />
        </button>
      </div>

      <div class="create-group-area">
        <div class="divider">
          <span>oder</span>
        </div>
        <button
            type="button"
            class="btn outline s-btn"
            @click="handleCreateGroupClick"
            :disabled="isLoading"
        >
          Gruppe erstellen
        </button>
      </div>

      <transition name="fade">
        <div v-if="error" class="error-banner">
          <component :is="AlertCircle" :size="16" />
          {{ error }}
        </div>
      </transition>
    </form>

    <div class="card-footer">
      <div class="status-line">
        <GetStatushwb2 />
      </div>
      <p  @click="showIt = false" v-if="showIt" class="disclaimer">
        {{ t('welcome.auth.disclaimer') }}
      </p>
      <p style="cursor: pointer" v-else @click="showIt = true" class="disclaimer link-subtle">
        {{ t('welcome.auth.disclaimerTitle') }}
      </p>
    </div>
  </div>

  <CreateGroupModal
      v-if="showCreateGroupModal"
      @close="showCreateGroupModal = false"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import GetStatushwb2 from "@/modules/welcome/components/GetStatushwb2.vue";
import { syncCsrfFromCookie, setCsrfToken } from '@/api/hwApi';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-vue-next'
import LoadingSpinner from "@/common/components/LoadingSpinner.vue";
import Checkbox from '@/common/components/Checkbox.vue';
import CreateGroupModal from '@/modules/auth/components/CreateGroupModal.vue';
import { useUserStore } from "@/stores/userStore";
import { useI18n } from "vue-i18n";
import { useGlobalAuthModal } from '@/core/composables/useGlobalAuthModal';

const { t } = useI18n();

const userStore = useUserStore();
const { openAuthModal } = useGlobalAuthModal();

const router = useRouter();
const auth = useAppAuth();
const password1 = ref('');
const password2 = ref('');
const error = ref<string | null>(null);
const accepted = ref(false)
const showPassword = ref(false);
const isLoading = ref(false);
const showIt = ref(false);
const showCreateGroupModal = ref(false);
const usernameInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  usernameInputRef.value?.focus();
});

async function submit() {
  if (!accepted.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const res = await auth.loginWithCode(
        password1.value.trim(),
        password2.value.trim()
    );

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

async function handleCreateGroupClick() {
  if (!userStore.isLoggedIn) {
    try {
      await openAuthModal();
    } catch {
      return; 
    }
  }
  
  if (userStore.isLoggedIn) {
    showCreateGroupModal.value = true;
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
  font-size: var(--font-size-h2);
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

.visibility-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--sub);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.1s ease;
}
.visibility-toggle:hover {
  color: var(--text);
}

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
  display: flex;
  justify-content: center;
  align-items: center;
}

.s-btn:disabled {
  cursor: not-allowed;
  background: var(--sub);
  border-color: var(--sub);
}

.create-group-area {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--sub);
  font-size: 0.9rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border);
}

.divider span {
  padding: 0 10px;
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
  font-size: var(--font-size-sub);
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>