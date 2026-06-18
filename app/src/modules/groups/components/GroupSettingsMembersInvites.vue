<script setup lang="ts">
import { UserRoundPlus, Copy, Check, Undo2 } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useModalStore } from '@/stores/modalStore';
import { useToast } from '@/common/composables/useToast';
import type { GroupInviteLog } from '@/modules/groups/types';

defineProps<{
  invites: GroupInviteLog[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'revoke-invite', id: string): void;
  (e: 'refresh-invites'): void;
}>();

const { t } = useI18n();
const { createInvite } = useAppAuth();
const modalStore = useModalStore();
const toast = useToast();

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
    <div class="flex items-center justify-between gap-4 mb-4">
      <PageHeader class="m-0!">
        {{ t('groups.settings.members.invite_links.title') }}
      </PageHeader>
      <BaseButton
        type="button"
        variant="action"
        :loading="loadingInvite"
        :icon="UserRoundPlus"
        class="gap-2 shrink-0"
        @click="inviteMember"
      >
        {{ t('groups.settings.members.invite_links.generate_button') }}
      </BaseButton>
    </div>

    <div
      v-if="loading && invites.length === 0"
      class="flex justify-center p-8 bg-surface border border-surface-border rounded-xl"
    >
      <BaseSpinner />
    </div>
    <div
      v-else-if="invites.length === 0"
      class="text-center p-8 text-on-ghost-muted text-base bg-surface border border-surface-border rounded-xl"
    >
      {{ t('groups.settings.members.invite_links.empty') }}
    </div>
    <table
      v-else
      class="w-full min-w-max table-auto text-left [&_td]:p-3 [&_th]:p-3 [&_th]:font-bold [&_th]:text-base [&_td]:min-w-40 [&_td]:max-w-80"
    >
      <thead>
        <tr>
          <th>Link</th>
          <th>Status</th>
          <th>Erstellt von</th>
          <th>Erstellt am</th>
          <th>Ablaufdatum</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="invite in invites" :key="invite.id">
          <tr class="border-t border-canvas-border">
            <td class="truncate select-all">
              {{ getInviteUrl(invite.token) }}
            </td>
            <td :class="getBadgeClass(invite)" class="text-sm font-bold">
              {{ getBadgeLabel(invite) }}
            </td>
            <td>{{ invite.createdByName || 'System' }}</td>
            <td>
              {{
                new Date(invite.createdAt).toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }}
            </td>
            <td>
              <template v-if="invite.usedAt"
                >Used by
                <strong>{{ invite.usedByName || 'Unbekannt' }}</strong>
                ({{
                  new Date(invite.usedAt).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }})
              </template>
              <template v-else-if="invite.revokedAt"
                >Revoked by
                <strong>{{ invite.revokedByName || 'Unbekannt' }}</strong>
                ({{
                  new Date(invite.revokedAt).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }})
              </template>
              <template v-else>
                {{
                  new Date(invite.expiresAt).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}
              </template>
            </td>

            <td class="py-0! px-2! min-w-0! space-x-2">
              <BaseTooltip
                v-if="isInviteActive(invite)"
                content="Link kopieren"
                placement="bottom"
              >
                <BaseButton
                  variant="ghost"
                  size="sm"
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
                  size="sm"
                  :icon="Undo2"
                  @click="emit('revoke-invite', invite.id)"
                />
              </BaseTooltip>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
