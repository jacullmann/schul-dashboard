<script setup lang="ts">
import {
  RefreshCw,
  CircleMinus,
  Crown,
  UserRoundPlus,
  Copy,
  Check,
  Undo2,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import InfoModal from '@/common/components/InfoModal.vue';
import type { GroupMember, GroupInviteLog } from '@/modules/groups/types';
import { computed, ref } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useModalStore } from '@/stores/modalStore';
import { useToast } from '@/common/composables/useToast';

const { t, locale } = useI18n();

function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return t('auth.sessions.time.just_now');
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      const rtf = new Intl.RelativeTimeFormat(locale.value, {
        numeric: 'always',
      });
      if (diffHours < 1) {
        return rtf.format(-diffMins, 'minute');
      }
      return rtf.format(-diffHours, 'hour');
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      const rtf = new Intl.RelativeTimeFormat(locale.value, {
        numeric: 'auto',
      });
      return rtf.format(-diffDays, 'day');
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      const rtf = new Intl.RelativeTimeFormat(locale.value, {
        numeric: 'always',
      });
      return rtf.format(-diffMonths, 'month');
    }

    const diffYears = Math.floor(diffDays / 365);
    const rtf = new Intl.RelativeTimeFormat(locale.value, {
      numeric: 'always',
    });
    return rtf.format(-diffYears, 'year');
  } catch {
    return '';
  }
}

const props = defineProps<{
  members: GroupMember[];
  bannedUsers?: { userId: string; generatedName: string; bannedAt: string }[];
  loading: boolean;
  loadingBanned?: boolean;
  isOwner?: boolean;
  invites?: GroupInviteLog[];
  loadingInvites?: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'change-role', userId: string, newRole: string): void;
  (e: 'remove', userId: string, name: string, ban: boolean): void;
  (e: 'revert-ban', userId: string): void;
  (e: 'transfer-ownership', userId: string): void;
  (e: 'revoke-invite', id: string): void;
  (e: 'refresh-invites'): void;
}>();

const { checkPermission, createInvite } = useAppAuth();
const canModerateMembers = computed(() => checkPermission('moderate_members'));

const canDemoteAdmin = computed(() => props.isOwner);

function onRoleChange(member: GroupMember, newRole: string) {
  if (newRole !== member.role) {
    emit('change-role', member.userId, newRole);
  }
}

const removeModal = ref({
  isOpen: false,
  userId: '',
  userName: '',
  ban: false,
});

function openRemoveModal(userId: string, name: string) {
  removeModal.value = {
    isOpen: true,
    userId,
    userName: name,
    ban: false,
  };
}

function closeRemoveModal() {
  removeModal.value.isOpen = false;
}

function confirmRemove() {
  emit(
    'remove',
    removeModal.value.userId,
    removeModal.value.userName,
    removeModal.value.ban,
  );
  closeRemoveModal();
}

const toast = useToast();
const modalStore = useModalStore();

const loadingInvite = ref(false);
const copiedId = ref<string | null>(null);

async function inviteMember() {
  loadingInvite.value = true;
  try {
    const res = await createInvite();
    if (res.ok && res.token) {
      modalStore.openInviteModal(res.token);
      emit('refresh-invites');
    } else {
      toast.error(res.error || 'Failed to generate invite link.');
    }
  } catch (err) {
    console.error('Failed to generate invite link:', err);
    toast.error('Failed to generate invite link.');
  } finally {
    loadingInvite.value = false;
  }
}

async function copyLink(inviteId: string, token: string) {
  const url = `${window.location.origin}/invite/${token}`;
  try {
    await navigator.clipboard.writeText(url);
    copiedId.value = inviteId;
    toast.success(t('auth.groups.invite.copied'));
    setTimeout(() => {
      if (copiedId.value === inviteId) {
        copiedId.value = null;
      }
    }, 3000);
  } catch (err) {
    toast.error('Failed to copy to clipboard');
  }
}

function isInviteActive(invite: GroupInviteLog): boolean {
  return (
    invite.usedAt === null &&
    invite.revokedAt === null &&
    new Date(invite.expiresAt) > new Date()
  );
}

function getBadgeClass(invite: GroupInviteLog): string {
  if (invite.usedAt !== null) {
    return 'text-blue-500';
  }
  if (invite.revokedAt !== null) {
    return 'text-danger';
  }
  if (new Date(invite.expiresAt) <= new Date()) {
    return 'text-on-ghost-subtle';
  }
  return 'text-success';
}

function getBadgeLabel(invite: GroupInviteLog): string {
  if (invite.usedAt !== null) return 'Verwendet';
  if (invite.revokedAt !== null) return 'Widerrufen';
  if (new Date(invite.expiresAt) <= new Date()) return 'Abgelaufen';
  return 'Aktiv';
}

function getInviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}
</script>

<template>
  <div class="animate-fade-up">
    <PageHeader>
      {{ t('groups.settings.members.title') }}

      <template #info>
        <InfoModal
          tooltip="t('groups.settings.members.info.tooltip')"
          title="t('groups.settings.members.title')"
        >
          <h3>{{ t('groups.settings.members.info.headline') }}</h3>

          <h3>{{ t('groups.settings.members.info.list_title') }}</h3>
          <p>{{ t('groups.settings.members.info.list_text') }}</p>

          <h3>{{ t('groups.settings.members.info.role_title') }}</h3>
          <p>{{ t('groups.settings.members.info.role_text') }}</p>

          <h3>{{ t('groups.settings.members.info.remove_title') }}</h3>
          <p>{{ t('groups.settings.members.info.remove_text') }}</p>
        </InfoModal>
      </template>

      <template #action>
        <BaseTooltip :content="t('common.buttons.refresh')">
          <BaseButton
            :disabled="loading"
            variant="ghost"
            :icon="RefreshCw"
            @click="emit('refresh')"
          />
        </BaseTooltip>
      </template>
    </PageHeader>

    <div v-if="loading && members.length === 0" class="flex justify-center p-8">
      <BaseSpinner />
    </div>
    <div
      v-else-if="members.length === 0"
      class="text-center p-8 text-on-ghost-muted text-base"
    >
      {{ t('groups.settings.members.list.empty') }}
    </div>

    <div v-else class="flex flex-col gap-1.5">
      <div
        v-for="(member, index) in members"
        :key="member.userId"
        class="flex max-md:flex-col items-center justify-between p-2 px-3 bg-surface border border-surface-border shadow-input rounded-xl gap-3 animate-fade-up"
        :style="{
          animationDelay: `${index * 0.075}s`,
          animationFillMode: 'both',
        }"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <span
            class="font-semibold text-base whitespace-nowrap overflow-hidden text-ellipsis"
            >{{ member.generatedName }}</span
          >
          <span class="text-on-ghost-muted text-sm">{{
            t('groups.settings.members.joined', {
              time: formatRelativeTime(member.joinedAt),
            })
          }}</span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <BaseTooltip
            v-if="isOwner && member.role === 'admin'"
            :content="t('groups.settings.members.actions.transfer_ownership')"
            placement="bottom"
          >
            <BaseButton
              variant="ghost"
              :icon="Crown"
              @click="emit('transfer-ownership', member.userId)"
            />
          </BaseTooltip>
          <BaseTooltip
            :content="t('groups.settings.members.actions.remove')"
            placement="bottom"
          >
            <BaseButton
              variant="ghost"
              :disabled="member.role === 'admin' || !canModerateMembers"
              :icon="CircleMinus"
              @click="openRemoveModal(member.userId, member.generatedName)"
            />
          </BaseTooltip>

          <BaseSelect
            :model-value="member.role"
            :disabled="
              !canModerateMembers ||
              (member.role === 'admin' && !canDemoteAdmin)
            "
            :form="false"
            classes="w-40!"
            :options="[
              { label: 'Mitglied', value: 'user' },
              { label: 'Moderator', value: 'moderator' },
              { label: 'Admin', value: 'admin' },
            ]"
            @update:model-value="(val: string) => onRoleChange(member, val)"
          />
        </div>
      </div>
    </div>

    <PageHeader class="mt-8">
      {{ t('groups.settings.members.ban_list.title') }}
    </PageHeader>

    <div
      v-if="loadingBanned && (!bannedUsers || bannedUsers.length === 0)"
      class="flex justify-center p-8"
    >
      <BaseSpinner />
    </div>
    <div
      v-else-if="!bannedUsers || bannedUsers.length === 0"
      class="text-center p-8 text-on-ghost-muted text-base"
    >
      {{ t('groups.settings.members.ban_list.empty') }}
    </div>
    <div v-else class="flex flex-col gap-1.5">
      <div
        v-for="(user, index) in bannedUsers"
        :key="user.userId"
        class="flex items-center justify-between p-2 px-3 bg-surface border border-surface-border shadow-input rounded-xl gap-3 animate-fade-up"
        :style="{
          animationDelay: `${index * 0.075}s`,
          animationFillMode: 'both',
        }"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <span
            class="font-semibold text-base whitespace-nowrap overflow-hidden text-ellipsis"
            >{{ user.generatedName }}</span
          >
          <span class="text-xs font-medium text-on-ghost-muted"
            >{{ t('groups.settings.members.ban_list.banned_on_prefix')
            }}{{ new Date(user.bannedAt).toLocaleDateString('de-DE') }}</span
          >
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <BaseButton
            :disabled="!canModerateMembers"
            variant="ghost"
            @click="emit('revert-ban', user.userId)"
          >
            {{ t('groups.settings.members.ban_list.actions.unban') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <div v-if="checkPermission('invite_members')" class="mt-8">
      <div class="flex items-center justify-between gap-4 mb-4">
        <PageHeader class="m-0!"> Einladungslinks </PageHeader>
        <BaseButton
          type="button"
          variant="action"
          :loading="loadingInvite"
          :icon="UserRoundPlus"
          class="gap-2 shrink-0"
          @click="inviteMember"
        >
          Link generieren
        </BaseButton>
      </div>

      <div
        v-if="loadingInvites && (!invites || invites.length === 0)"
        class="flex justify-center p-8 bg-surface border border-surface-border rounded-xl"
      >
        <BaseSpinner />
      </div>
      <div
        v-else-if="!invites || invites.length === 0"
        class="text-center p-8 text-on-ghost-muted text-base bg-surface border border-surface-border rounded-xl"
      >
        Keine Einladungslinks vorhanden.
      </div>
      <div v-else class="flex flex-col gap-1.5">
        <div
          v-for="(invite, index) in invites"
          :key="invite.id"
          class="flex max-md:flex-col md:items-center justify-between p-2 px-3 bg-surface border border-surface-border shadow-input rounded-xl gap-3 animate-fade-up"
          :style="{
            animationDelay: `${index * 0.05}s`,
            animationFillMode: 'both',
          }"
        >
          <div class="flex flex-col min-w-0 gap-1.5">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="text-base font-bold text-on-ghost truncate select-all"
              >
                {{ getInviteUrl(invite.token) }}
              </span>
              <span :class="getBadgeClass(invite)" class="text-sm font-bold">
                {{ getBadgeLabel(invite) }}
              </span>
            </div>

            <div
              class="text-sm text-on-ghost-muted flex flex-wrap gap-x-2 gap-y-1 items-center"
            >
              <span
                >Erstellt von:
                <strong>{{ invite.createdByName || 'System' }}</strong></span
              >
              <span>•</span>
              <span
                >Erstellt am:
                {{
                  new Date(invite.createdAt).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}</span
              >
              <template v-if="invite.usedAt">
                <span>•</span>
                <span
                  >Verwendet von:
                  <strong>{{ invite.usedByName || 'Unbekannt' }}</strong> ({{
                    new Date(invite.usedAt).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  }})</span
                >
              </template>
              <template v-else-if="invite.revokedAt">
                <span>•</span>
                <span
                  >Widerrufen von:
                  <strong>{{ invite.revokedByName || 'Unbekannt' }}</strong> ({{
                    new Date(invite.revokedAt).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  }})</span
                >
              </template>
              <template v-else>
                <span>•</span>
                <span
                  >Ablaufdatum:
                  {{
                    new Date(invite.expiresAt).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  }}</span
                >
              </template>
            </div>
          </div>

          <div
            class="flex items-center gap-2 flex-shrink-0 self-end md:self-center"
          >
            <BaseTooltip
              v-if="isInviteActive(invite)"
              content="Link kopieren"
              placement="bottom"
            >
              <BaseButton
                variant="ghost"
                :icon="copiedId === invite.id ? Check : Copy"
                @click="copyLink(invite.id, invite.token)"
              />
            </BaseTooltip>

            <BaseTooltip
              v-if="isInviteActive(invite)"
              content="Widerrufen"
              placement="bottom"
            >
              <BaseButton
                variant="ghost"
                :icon="Undo2"
                @click="emit('revoke-invite', invite.id)"
              />
            </BaseTooltip>
          </div>
        </div>
      </div>
    </div>

    <BaseModal
      :open="removeModal.isOpen"
      :danger="true"
      :submit="confirmRemove"
      @cancel="closeRemoveModal"
    >
      <template #title>{{
        t('groups.settings.members.remove_modal.title')
      }}</template>

      <template #content>
        <p class="m-0!">
          {{ t('groups.settings.members.remove_modal.confirm_prefix')
          }}<strong>{{ removeModal.userName }}</strong
          >{{ t('groups.settings.members.remove_modal.confirm_suffix') }}
        </p>
        <p class="m-0!">
          {{ t('groups.settings.members.remove_modal.rejoin_info') }}
        </p>

        <BaseCheckbox v-model="removeModal.ban"
          >{{ t('groups.settings.members.remove_modal.ban_checkbox_prefix')
          }}<strong>{{ removeModal.userName }}</strong
          >{{
            t('groups.settings.members.remove_modal.ban_checkbox_suffix')
          }}</BaseCheckbox
        >
      </template>

      <template #action-text>
        {{ t('groups.settings.members.remove_modal.submit_button') }}
      </template>
    </BaseModal>
  </div>
</template>
