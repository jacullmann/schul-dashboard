<script setup lang="ts">
import {
  RefreshCw,
  CircleMinus,
  Crown,
  UserRoundPlus,
  Ban,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import InfoModal from '@/common/components/InfoModal.vue';
import type { GroupMember } from '@/modules/groups/types';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

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
  loading: boolean;
  isOwner?: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'change-role', userId: string, newRole: string): void;
  (e: 'remove', userId: string, name: string, ban: boolean): void;
  (e: 'transfer-ownership', userId: string): void;
}>();

const { checkPermission } = useAppAuth();
const canModerateMembers = computed(() => checkPermission('moderate_members'));
const canDemoteAdmin = computed(() => props.isOwner);

const groupId = computed(() => route.params.groupId as string);

function goToInvites() {
  void router.push({
    name: 'group-admin',
    params: { groupId: groupId.value, tab: 'members', subTab: 'invites' },
  });
}

function goToBanned() {
  void router.push({
    name: 'group-admin',
    params: { groupId: groupId.value, tab: 'members', subTab: 'banned' },
  });
}

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
</script>

<template>
  <div class="animate-fade-up">
    <!-- Subpages navigation list above the members list -->
    <div class="flex flex-col max-w-200 mx-auto mb-6 max-md:-mx-6">
      <BaseList
        v-if="checkPermission('invite_members')"
        :chevron="true"
        :separator="true"
        @click="goToInvites"
      >
        <template #icon>
          <span class="flex size-10 justify-center items-center text-on-ghost">
            <UserRoundPlus :size="24" />
          </span>
        </template>
        <template #label>
          <span class="flex flex-col min-h-10 justify-between">
            <span class="text-on-ghost text-base/tight font-medium">
              {{ t('groups.settings.members.invite_links.title') }}
            </span>
            <span class="text-on-ghost-muted text-xs/tight font-normal">
              {{ t('groups.settings.members.invite_links.description') }}
            </span>
          </span>
        </template>
      </BaseList>

      <BaseList
        :chevron="true"
        :separator="false"
        @click="goToBanned"
      >
        <template #icon>
          <span class="flex size-10 justify-center items-center text-on-ghost">
            <Ban :size="24" />
          </span>
        </template>
        <template #label>
          <span class="flex flex-col min-h-10 justify-between">
            <span class="text-on-ghost text-base/tight font-medium">
              {{ t('groups.settings.members.ban_list.title') }}
            </span>
            <span class="text-on-ghost-muted text-xs/tight font-normal">
              {{ t('groups.settings.members.ban_list.description') }}
            </span>
          </span>
        </template>
      </BaseList>
    </div>

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

    <div v-else class="flex flex-col gap-2 max-w-200 mx-auto">
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
