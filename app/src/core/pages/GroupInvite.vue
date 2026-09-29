<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { useModalStore } from '@/stores/modalStore';
import { useToast } from '@/common/composables/useToast';
import Avatar from '@/modules/auth/components/Avatar.vue';
import { AlertCircle } from '@lucide/vue';
import {
  clearPendingInvite,
  savePendingInvite,
} from '@/modules/auth/utils/pendingInvite';

const props = defineProps<{ token: string }>();

const { t } = useI18n();
const router = useRouter();
const auth = useAppAuth();
const userStore = useUserStore();
const subjectStore = useSubjectStore();
const modalStore = useModalStore();
const toast = useToast();

const loading = ref(true);
const ok = ref(false);
const errorMsg = ref('');

const groupName = ref('');
const avatarUrl = ref<string | null>(null);
const memberCount = ref<number>(0);
const joining = ref(false);

async function loadInvite(token: string) {
  loading.value = true;
  ok.value = false;
  errorMsg.value = '';

  const res = await auth.getInvite(token);
  if (token !== props.token) return;

  if (res.ok && res.alreadyMember && res.groupId) {
    clearPendingInvite();
    await openExistingGroup(res.groupId);
    return;
  }

  if (res.ok && res.groupName) {
    groupName.value = res.groupName;
    avatarUrl.value = res.avatarUrl || null;
    memberCount.value = res.memberCount || 0;
    ok.value = true;
  } else {
    errorMsg.value = res.error || t('auth.groups.invite.invalid_desc');
    clearPendingInvite();
  }
  loading.value = false;
}

watch(() => props.token, loadInvite, { immediate: true });

async function handleJoin() {
  if (joining.value) return;

  joining.value = true;
  try {
    const res = await auth.acceptInvite(props.token);
    if (res.ok && res.alreadyMember && res.groupId) {
      await openExistingGroup(res.groupId);
    } else if (res.ok && res.groupId) {
      clearPendingInvite();
      toast.success(t('auth.groups.invite.success_join'));
      try {
        await userStore.fetchUser();

        await subjectStore.loadSubjects(res.groupId);

        if (
          subjectStore.requiredCourseSubjects.length > 0 ||
          subjectStore.optionalCourseSubjects.length > 0
        ) {
          modalStore.openSetup(res.groupId);
        }
      } catch (err) {
        console.error('Failed to load courses check after join:', err);
      }
      await router.push({
        name: 'group-dashboard',
        params: { groupId: res.groupId },
      });
    } else {
      toast.error(res.error || t('auth.groups.invite.join_failed'));
    }
  } finally {
    joining.value = false;
  }
}

async function openExistingGroup(groupId: string) {
  toast.info(t('auth.groups.invite.already_member'));
  await router.replace({ name: 'group-dashboard', params: { groupId } });
}

// The token is only persisted once the visitor chooses to sign in or sign up,
// so merely viewing a link never leaves it behind on a shared device.
function continueWithAuth(routeName: 'login' | 'register') {
  savePendingInvite(props.token);
  void router.push({ name: routeName });
}

const submitAction = computed(() => {
  if (!ok.value) return undefined;
  return auth.isLoggedIn.value ? handleJoin : () => continueWithAuth('login');
});

function handleCancel() {
  if (!ok.value) return;
  if (auth.isLoggedIn.value) {
    clearPendingInvite();
    void router.push({ name: 'groups' });
  } else {
    continueWithAuth('register');
  }
}
</script>

<template>
  <BaseModal
    :open="true"
    :sheet="false"
    :submit="submitAction"
    :loading="joining"
    @cancel="handleCancel"
  >
    <template #title>
      {{ t('auth.groups.invite.card_title') }}
    </template>

    <template #content>
      <template v-if="loading">
        <div class="loading-container">
          <div class="spinner"></div>
          <p class="mt-4 text-on-ghost-muted text-sm font-medium">
            {{ t('auth.groups.invite.loading') }}
          </p>
        </div>
      </template>

      <template v-else-if="ok">
        <div
          class="scale-up animate-delay-100 flex gap-3 justify-center items-center"
        >
          <Avatar
            :name="groupName"
            :picture="avatarUrl || undefined"
            :size="16"
          />
          <div>
            <div class="font-bold text-lg text-on-ghost">{{ groupName }}</div>
            <div class="text-sm text-on-ghost-muted">
              {{
                memberCount === 1
                  ? t('auth.groups.invite.members_count_one', { count: 1 })
                  : t('auth.groups.invite.members_count_other', {
                      count: memberCount,
                    })
              }}
            </div>
          </div>
        </div>
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
        </div>
      </template>
    </template>

    <template #action-text
      ><template v-if="auth.isLoggedIn.value">{{
        t('auth.groups.invite.btn_join')
      }}</template
      ><template v-else>{{
        t('auth.groups.invite.btn_login')
      }}</template></template
    >

    <template v-if="!auth.isLoggedIn.value" #cancel-text>{{
      t('auth.groups.invite.btn_register')
    }}</template>
  </BaseModal>
</template>

<style scoped>
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
  border: 3.5px solid var(--color-ghost-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.4, 0.15, 0.3, 0.9) infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
</style>
