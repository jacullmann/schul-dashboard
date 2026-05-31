<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '@/common/composables/useToast';
import Avatar from '@/modules/auth/components/Avatar.vue';
import { LogIn, UserPlus, LogIn as JoinIcon, AlertCircle } from '@lucide/vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAppAuth();
const userStore = useUserStore();
const toast = useToast();

const token = route.params.token as string;
const loading = ref(true);
const ok = ref(false);
const errorMsg = ref('');

const groupName = ref('');
const avatarUrl = ref<string | null>(null);
const joining = ref(false);

onMounted(async () => {
  if (!token) {
    ok.value = false;
    errorMsg.value = t('auth.groups.invite.invalid_desc');
    loading.value = false;
    return;
  }

  try {
    const res = await auth.getInvite(token);
    if (res.ok && res.groupName) {
      groupName.value = res.groupName;
      avatarUrl.value = res.avatarUrl || null;
      ok.value = true;

      // If not logged in, save the token for after-login redirect
      if (!auth.isLoggedIn.value) {
        sessionStorage.setItem('pending_invite_token', token);
      }
    } else {
      ok.value = false;
      errorMsg.value = res.error || t('auth.groups.invite.invalid_desc');
    }
  } catch (err) {
    ok.value = false;
    errorMsg.value = t('auth.groups.invite.invalid_desc');
  } finally {
    loading.value = false;
  }
});

async function handleJoin() {
  if (joining.value) return;

  joining.value = true;
  try {
    const res = await auth.acceptInvite(token);
    if (res.ok && res.groupId) {
      toast.success(t('auth.groups.invite.success_join'));
      try {
        await userStore.fetchUser();
      } catch {}
      await router.push(`/groups/${res.groupId}/dashboard`);
    } else {
      toast.error(res.error || t('auth.groups.invite.join_failed'));
    }
  } catch (err: any) {
    toast.error(err.message || t('auth.groups.invite.join_failed'));
  } finally {
    joining.value = false;
  }
}

function handleLogin() {
  router.push('/login');
}

function handleRegister() {
  router.push('/register');
}
</script>

<template>
  <div class="card invite-card animate-fade-up">
    <div class="invite-content">
      <template v-if="loading">
        <div class="loading-container">
          <div class="spinner"></div>
          <p class="mt-4 text-on-ghost-muted text-sm font-medium">
            {{ t('auth.groups.invite.loading') }}
          </p>
        </div>
      </template>

      <template v-else-if="ok">
        <!-- Group Avatar -->
        <div class="avatar-wrapper mb-6 scale-up animate-delay-100">
          <div class="avatar-glow"></div>
          <Avatar
            :name="groupName"
            :picture="avatarUrl"
            :size="24"
            class="relative z-10 border-4 border-canvas shadow-xl"
          />
        </div>

        <h1 class="invite-title mb-2 font-display">
          {{ t('auth.groups.invite.card_title') }}
        </h1>

        <p class="invite-description text-on-ghost-muted mb-8 max-w-sm">
          {{ t('auth.groups.invite.join_prompt', { groupName }) }}
        </p>

        <!-- Logged In Join Button -->
        <template v-if="auth.isLoggedIn.value">
          <div class="action-buttons w-full flex flex-col gap-3">
            <BaseButton
              @click="handleJoin"
              variant="primary"
              class="w-full h-12 justify-center font-semibold text-base gap-2 hover:scale-(102) active:scale-(98) transition-all duration-200"
              :loading="joining"
            >
              <JoinIcon :size="20" />
              <span>{{ t('auth.groups.invite.btn_join') }}</span>
            </BaseButton>
            <BaseButton
              @click="$router.push('/groups')"
              variant="ghost"
              class="w-full h-11 justify-center text-sm font-medium text-on-ghost-muted hover:text-on-ghost transition-colors duration-200"
              :disabled="joining"
            >
              {{ t('auth.groups.invite.btn_cancel') }}
            </BaseButton>
          </div>
        </template>

        <!-- Logged Out Action Buttons -->
        <template v-else>
          <div class="action-buttons w-full flex flex-col sm:flex-row gap-3">
            <BaseButton
              @click="handleLogin"
              variant="primary"
              class="flex-1 h-12 justify-center font-semibold gap-2 hover:scale-(102) active:scale-(98) transition-all duration-200"
            >
              <LogIn :size="18" />
              <span>{{ t('auth.groups.invite.btn_login') }}</span>
            </BaseButton>
            <BaseButton
              @click="handleRegister"
              variant="ghost"
              class="flex-1 h-12 justify-center font-semibold gap-2 border border-canvas-border hover:bg-ghost/30 hover:scale-(102) active:scale-(98) transition-all duration-200"
            >
              <UserPlus :size="18" />
              <span>{{ t('auth.groups.invite.btn_register') }}</span>
            </BaseButton>
          </div>
        </template>
      </template>

      <!-- Invalid/Expired Token Error State -->
      <template v-else>
        <div class="error-container py-6">
          <div class="error-icon-wrapper mb-4 text-danger animate-bounce-slow">
            <AlertCircle :size="64" />
          </div>
          <h1 class="invite-title text-danger mb-3 font-display">
            {{ t('auth.groups.invite.invalid_title') }}
          </h1>
          <p class="invite-description text-on-ghost-muted mb-8 max-w-sm">
            {{ errorMsg }}
          </p>
          <BaseButton
            @click="$router.push('/')"
            variant="ghost"
            class="h-11 px-6 border border-canvas-border justify-center text-sm font-medium hover:bg-ghost/30 transition-colors duration-200"
          >
            {{ t('common.buttons.back') }}
          </BaseButton>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.invite-card {
  max-width: 500px;
  width: 100%;
  padding: 40px 32px;
  background: rgba(var(--color-canvas-raw), 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid var(--color-canvas-border);
  border-radius: var(--radius-2xl);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
  overflow: hidden;
}

.invite-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  position: relative;
  z-index: 10;
}

.avatar-wrapper {
  position: relative;
  width: 96px;
  height: 96px;
}

.avatar-glow {
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);
  opacity: 0.3;
  filter: blur(8px);
  border-radius: 50%;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.2;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.45;
  }
}

.invite-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-on-ghost);
  line-height: 1.25;
}

.invite-description {
  font-size: var(--text-base);
  line-height: 1.6;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3.5px solid var(--color-surface-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.4, 0.15, 0.3, 0.9) infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.scale-up {
  animation: scale-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes scale-up {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-bounce-slow {
  animation: bounce-slow 3s infinite;
}

@keyframes bounce-slow {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@media (max-width: 640px) {
  .invite-card {
    padding: 32px 20px;
    border-radius: var(--radius-xl);
  }

  .action-buttons {
    flex-direction: column !important;
  }
}
</style>
