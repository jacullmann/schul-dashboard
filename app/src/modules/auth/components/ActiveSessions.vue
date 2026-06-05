<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Laptop,
  Smartphone,
  Monitor,
  Trash2,
  LogOut,
  AlertCircle,
} from '@lucide/vue';
import hw from '../../../api/api';
import { useModalStore } from '@/stores/modalStore';
import { useI18n } from 'vue-i18n';

interface SessionLocation {
  city: string | null;
  country: string | null;
  countryCode: string | null;
}

interface ActiveSession {
  familyId: string;
  issuedAt: string;
  lastUsedAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  location: SessionLocation | null;
}

const sessions = ref<ActiveSession[]>([]);
const loading = ref(true);
const revokingId = ref<string | null>(null);
const revokingAll = ref(false);
const error = ref<string | null>(null);
const currentFamilyId = ref<string | null>(null);

const { t } = useI18n();
const modalStore = useModalStore();

async function fetchSessions() {
  loading.value = true;
  error.value = null;
  try {
    const res = await hw.get('/auth/sessions');
    sessions.value = res.data.sessions || [];
    currentFamilyId.value = res.data.currentFamilyId ?? null;
  } catch (err) {
    console.error('Failed to fetch active sessions:', err);
    error.value = t('auth.sessions.errors.load_failed');
  } finally {
    loading.value = false;
  }
}

function isCurrentSession(session: ActiveSession): boolean {
  return !!currentFamilyId.value && session.familyId === currentFamilyId.value;
}

async function revokeSession(session: ActiveSession) {
  const isConfirmed = await modalStore.confirm({
    title: t('auth.sessions.delete_modal.title'),
    content: t('auth.sessions.delete_modal.message', {
      browser: parseUserAgent(session.userAgent).browser,
      os: parseUserAgent(session.userAgent).os,
    }),
    submitText: t('common.buttons.logout'),
    danger: true,
  });

  if (!isConfirmed) return;

  revokingId.value = session.familyId;
  try {
    await hw.delete(`/auth/sessions/${session.familyId}`);
    sessions.value = sessions.value.filter(
      (s) => s.familyId !== session.familyId,
    );
  } catch (err) {
    console.error('Failed to revoke session:', err);
    alert(t('auth.sessions.errors.delete_failed'));
  } finally {
    revokingId.value = null;
  }
}

async function logoutAllOtherSessions() {
  const isConfirmed = await modalStore.confirm({
    title: t('auth.sessions.delete_all_modal.title'),
    content: t('auth.sessions.delete_all_modal.message'),
    submitText: t('auth.sessions.delete_all_modal.submit'),
    danger: true,
  });

  if (!isConfirmed) return;

  revokingAll.value = true;
  try {
    const others = sessions.value.filter((s) => !isCurrentSession(s));

    await Promise.all(others.map((s) => hw.delete(`/auth/sessions/${s.familyId}`)));

    sessions.value = sessions.value.filter((s) => isCurrentSession(s));
  } catch (err) {
    console.error('Failed to logout other sessions:', err);
    alert(t('auth.sessions.errors.delete_all_failed'));
    await fetchSessions();
  } finally {
    revokingAll.value = false;
  }
}

function parseUserAgent(ua: string | null): {
  browser: string;
  os: string;
  isMobile: boolean;
} {
  if (!ua) {
    return {
      browser: t('auth.sessions.browser.unknown'),
      os: t('auth.sessions.os.unknown'),
      isMobile: false,
    };
  }

  const uaLower = ua.toLowerCase();
  let browser = 'Unbekannter Browser';
  let os = t('auth.sessions.os.unknown');
  let isMobile = false;

  if (/mobile|android|iphone|ipad|phone/i.test(uaLower)) {
    isMobile = true;
  }

  if (uaLower.includes('windows')) {
    os = 'Windows';
  } else if (uaLower.includes('macintosh') || uaLower.includes('mac os x')) {
    os = uaLower.includes('iphone')
      ? 'iOS'
      : uaLower.includes('ipad')
        ? 'iPadOS'
        : 'macOS';
  } else if (uaLower.includes('android')) {
    os = 'Android';
  } else if (uaLower.includes('linux')) {
    os = 'Linux';
  } else if (uaLower.includes('iphone')) {
    os = 'iOS';
  } else if (uaLower.includes('ipad')) {
    os = 'iPadOS';
  } else if (uaLower.includes('cros')) {
    os = 'ChromeOS';
  }

  if (uaLower.includes('edg/')) {
    browser = 'Microsoft Edge';
  } else if (uaLower.includes('opera') || uaLower.includes('opr/')) {
    browser = 'Opera';
  } else if (uaLower.includes('chrome') || uaLower.includes('crios')) {
    browser = 'Google Chrome';
  } else if (uaLower.includes('firefox') || uaLower.includes('fxios')) {
    browser = 'Mozilla Firefox';
  } else if (uaLower.includes('safari') && !uaLower.includes('chrome')) {
    browser = 'Apple Safari';
  }

  return { browser, os, isMobile };
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('auth.sessions.time.just_now');
    if (diffMins < 60)
      return t('auth.sessions.time.minutes_ago', { mins: diffMins });

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return t('auth.sessions.time.hours_ago', { hours: diffHours });

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return t('auth.sessions.time.yesterday');
    return t('auth.sessions.time.days_ago', { days: diffDays });
  } catch {
    return '';
  }
}

onMounted(() => {
  fetchSessions();
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <h3>{{ t('auth.sessions.title') }}</h3>
      <div class="text-sm/relaxed text-on-ghost-muted">
        {{ t('auth.sessions.description') }}
      </div>
    </div>

    <div
      v-if="error"
      class="flex flex-col gap-3 p-4 bg-danger-hover border border-danger rounded-xl items-center text-center"
    >
      <AlertCircle class="text-danger" :size="32" />
      <span class="text-sm font-medium text-danger">{{ error }}</span>
      <BaseButton
        @click="fetchSessions"
        variant="ghost"
        class="!border-danger/30 hover:!bg-danger/10"
        >Erneut versuchen</BaseButton
      >
    </div>

    <div v-else-if="loading" class="flex flex-col gap-3">
      <div
        v-for="i in 2"
        :key="i"
        class="p-3 bg-surface border border-surface-border rounded-xl flex gap-3 items-center"
      >
        <BaseSkeleton class="w-10 h-10 rounded-lg shrink-0" />
        <div class="flex flex-col gap-2 flex-1">
          <BaseSkeleton class="w-32 h-4 rounded" />
          <BaseSkeleton class="w-48 h-3 rounded" />
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col gap-3">
      <div v-if="sessions.some(s => !isCurrentSession(s))" class="flex justify-end">
        <BaseButton
          @click="logoutAllOtherSessions"
          :disabled="revokingAll"
          :loading="revokingAll"
          variant="ghost"
          on="ghost"
          :icon="LogOut"
        >
          {{ t('auth.sessions.actions.delete_all') }}
        </BaseButton>
      </div>

      <div class="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
        <div
          v-for="session in sessions"
          :key="session.familyId"
          class="group relative flex gap-3 items-center p-3.5 bg-surface border border-surface-border shadow-input rounded-xl transition-all duration-200"
          :class="{
            'border-[var(--special--green)]/40 bg-success-surface/10': isCurrentSession(session),
          }"
        >
          <div
            class="flex items-center justify-center w-10 h-10 text-on-ghost-muted shrink-0 transition-colors"
          >
            <component
              :is="
                parseUserAgent(session.userAgent).isMobile
                  ? Smartphone
                  : parseUserAgent(session.userAgent).os !==
                      t('auth.sessions.os.unknown')
                    ? Laptop
                    : Monitor
              "
              :size="24"
            />
          </div>

          <div class="flex flex-col flex-1 min-w-0">
            <div class="text-base font-semibold text-on-ghost truncate">
              {{ parseUserAgent(session.userAgent).browser }}
              {{ t('auth.sessions.on_device') }}
              {{ parseUserAgent(session.userAgent).os }}
            </div>

            <div class="flex items-center gap-1 text-sm text-on-ghost-muted">
              {{ session.location?.city ? `${session.location.city}, ` : '' }}
              {{
                session.location?.country || t('auth.sessions.location.unknown')
              }}
              •
              {{
                isCurrentSession(session)
                    ? t('auth.sessions.this_device')
                    : formatDate(session.issuedAt)
              }}
            </div>
          </div>

          <template v-if="!isCurrentSession(session)">
            <BaseTooltip
              :content="t('auth.sessions.actions.delete')"
              placement="bottom"
            >
              <BaseButton
                @click="revokeSession(session)"
                :loading="revokingId === session.familyId"
                variant="ghost"
                on="ghost"
                :icon="Trash2"
              />
            </BaseTooltip>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
