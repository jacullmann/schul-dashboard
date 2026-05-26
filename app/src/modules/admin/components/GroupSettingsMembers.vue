<script setup lang="ts">
import { RefreshCw, UserRoundMinus, Crown } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import InfoModal from '@/common/components/InfoModal.vue';
import type { GroupMember } from '@/modules/admin/types';
import { computed, ref } from 'vue';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';

const { t } = useI18n();

const props = defineProps<{
  members: GroupMember[];
  bannedUsers?: { userId: string; generatedName: string; bannedAt: string }[];
  loading: boolean;
  loadingBanned?: boolean;
  isOwner?: boolean;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'change-role', userId: string, newRole: string): void;
  (e: 'remove', userId: string, name: string, ban: boolean): void;
  (e: 'revert-ban', userId: string): void;
  (e: 'transfer-ownership', userId: string): void;
}>();

const { checkPermission } = useAppAuth();
const canModerateMembers = computed(() => checkPermission('moderate_members'));

const canDemoteAdmin = computed(() => props.isOwner);

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Admin',
    moderator: 'Moderator',
    user: 'Mitglied',
  };
  return map[role] || role;
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
    <PageHeader>
      {{ t('admin.members.title') }}

      <template #info>
        <InfoModal tooltip="t('admin.members.info.tooltip')" title="t('admin.members.title')">
          <h3>{{ t('admin.members.info.headline') }}</h3>

          <h3>{{ t('admin.members.info.list_title') }}</h3>
          <p>{{ t('admin.members.info.list_text') }}</p>

          <h3>{{ t('admin.members.info.role_title') }}</h3>
          <p>{{ t('admin.members.info.role_text') }}</p>

          <h3>{{ t('admin.members.info.remove_title') }}</h3>
          <p>{{ t('admin.members.info.remove_text') }}</p>
        </InfoModal>
      </template>

      <template #action>
        <BaseTooltip :content="t('common.buttons.refresh')">
          <BaseButton
            @click="emit('refresh')"
            :disabled="loading"
            variant="ghost"
            :icon="RefreshCw"
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
      {{ t('admin.members.list.empty') }}
    </div>

    <div v-else class="flex flex-col gap-1.5">
      <div
        v-for="(member, index) in members"
        :key="member.userId"
        class="flex items-center justify-between p-2 px-3 bg-surface border border-surface-border shadow-input rounded-xl gap-3 animate-fade-up"
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
          <span
            class="text-[0.7rem] font-semibold uppercase tracking-[0.04em]"
            :class="{
              'text-[#6366f1]': member.role === 'admin',
              'text-[#f59e0b]': member.role === 'moderator',
              'text-on-ghost-muted': member.role === 'user',
            }"
          >
            {{ roleLabel(member.role) }}
          </span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <BaseTooltip
            v-if="isOwner && member.role === 'admin'"
            :content="t('admin.members.actions.transfer_ownership')"
            placement="bottom"
          >
            <BaseButton
              variant="ghost"
              @click="emit('transfer-ownership', member.userId)"
              :icon="Crown"
            />
          </BaseTooltip>
          <BaseTooltip :content="t('admin.members.actions.remove')" placement="bottom">
            <BaseButton
              variant="ghost"
              @click="openRemoveModal(member.userId, member.generatedName)"
              :disabled="member.role === 'admin' || !canModerateMembers"
              :icon="UserRoundMinus"
            />
          </BaseTooltip>

          <BaseSelect
            :modelValue="member.role"
            @update:modelValue="(val: string) => onRoleChange(member, val)"
            :disabled="!canModerateMembers || (member.role === 'admin' && !canDemoteAdmin)"
            :form="false"
            classes="w-48!"
            :options="[
              { label: 'Mitglied', value: 'user' },
              { label: 'Moderator', value: 'moderator' },
              { label: 'Admin', value: 'admin' },
            ]"
          />
        </div>
      </div>
    </div>

    <PageHeader class="mt-8"> {{ t('admin.members.ban_list.title') }} </PageHeader>

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
      {{ t('admin.members.ban_list.empty') }}
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
          <span
            class="text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-on-ghost-muted"
            >{{ t('admin.members.ban_list.banned_on_prefix') }}{{ new Date(user.bannedAt).toLocaleDateString('de-DE') }}</span
          >
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <BaseButton :disabled="!canModerateMembers" variant="ghost" @click="emit('revert-ban', user.userId)">
            {{ t('admin.members.ban_list.actions.unban') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <BaseModal
      :open="removeModal.isOpen"
      @cancel="closeRemoveModal"
      :danger="true"
      :submit="confirmRemove"
    >
      <template #title>{{ t('admin.members.remove_modal.title') }}</template>

      <template #content>
        <p class="m-0!">
          {{ t('admin.members.remove_modal.confirm_prefix') }}<strong>{{ removeModal.userName }}</strong>{{ t('admin.members.remove_modal.confirm_suffix') }}
        </p>
        <p class="m-0!">
          {{ t('admin.members.remove_modal.rejoin_info') }}
        </p>

        <BaseCheckbox v-model="removeModal.ban"
          >{{ t('admin.members.remove_modal.ban_checkbox_prefix') }}<strong>{{ removeModal.userName }}</strong>{{ t('admin.members.remove_modal.ban_checkbox_suffix') }}</BaseCheckbox
        >
      </template>

      <template #action-text> {{ t('admin.members.remove_modal.submit_button') }} </template>
    </BaseModal>
  </div>
</template>
