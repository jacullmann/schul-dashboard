<script setup lang="ts">
import { RefreshCw, UserRoundMinus, Crown } from '@lucide/vue';
import InfoModal from '@/common/components/InfoModal.vue';
import type { GroupMember } from '@/modules/admin/types';
import { computed, ref } from 'vue';

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

<div class="animate-fade-up">
    <PageHeader>
      Mitglieder

      <template #info>
        <InfoModal tooltip="Übersicht des Mitgliedermenüs" title="Mitglieder">
          <h3>Verwalte Mitglieder deiner Gruppe</h3>

          <h3>Mitgliedsliste</h3>
          <p>
            Hier siehst du eine Liste aller Mitglieder deiner Gruppe zusammen
            mit ihren Berechtigungen (Mitglied, Moderator, Admin). Um die Daten
            der Nutzer zu schützen wird ein automatisch generierter Alias
            angezeigt. Über das Dropdown-Menü kannst du die Rolle eines
            Mitglieds ändern.
          </p>

          <h3>Rollen ändern</h3>
          <p>
            Wenn du die Rolle eines Nutzers ändern willst, um ihm Berechtigungen
            zu erteilen oder zu entziehen, kannst du dies über das
            Dropdown-Menü, das neben jedem Mitglied steht, tun.
          </p>

          <h3>Mitglieder entfernen</h3>
          <p>
            Um ein Mitglied aus der Gruppe zu entfernen, klicke auf das
            entsprechende Symbol neben dem Dropdown-Menü. Admins können nicht
            entfernt werden.
          </p>
        </InfoModal>
      </template>

      <template #action>
        <BaseTooltip content="Aktualisieren">
          <BaseButton
            @click="emit('refresh')"
            :disabled="loading"
            variant="ghost"
            on="canvas"
            :icon="RefreshCw"
          />
        </BaseTooltip>
      </template>
    </PageHeader>

    <div v-if="loading && members.length === 0" class="text-center p-8 text-on-surface-muted text-body">Lädt...</div>
    <div v-else-if="members.length === 0" class="text-center p-8 text-on-surface-muted text-body">
      Keine Mitglieder gefunden.
    </div>

    <div v-else class="flex flex-col gap-1.5">
      <div v-for="member in members" :key="member.userId" class="flex items-center justify-between p-2 px-3 bg-surface border border-surface-border shadow-input rounded-lg gap-3 sm:flex-col sm:items-start sm:gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="font-semibold text-body whitespace-nowrap overflow-hidden text-ellipsis">{{ member.generatedName }}</span>
          <span class="text-[0.7rem] font-semibold uppercase tracking-[0.04em]" :class="{'text-[#6366f1]': member.role === 'admin', 'text-[#f59e0b]': member.role === 'moderator', 'text-on-surface-muted': member.role === 'user'}">
            {{ roleLabel(member.role) }}
          </span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0 sm:w-full">
          <BaseSelect
            class="w-[130px] text-sub p-1.5 px-2"
            :modelValue="member.role"
            @update:modelValue="(val: string) => onRoleChange(member, val)"
            :disabled="member.role === 'admin' && !canDemoteAdmin"
            :options="[
              { label: 'Mitglied', value: 'user' },
              { label: 'Moderator', value: 'moderator' },
              { label: 'Admin', value: 'admin' },
            ]"
          />
          <button
            class="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none text-on-surface-muted hover:bg-surface-hover hover:text-[#ef4444] transition-colors"
            @click="openRemoveModal(member.userId, member.generatedName)"
            title="Aus Gruppe entfernen"
            :disabled="member.role === 'admin'"
          >
            <UserRoundMinus :size="15" />
          </button>
          <button
            v-if="isOwner && member.role === 'admin'"
            class="flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none text-on-surface-muted hover:bg-surface-hover hover:text-[#6366f1] transition-colors"
            @click="emit('transfer-ownership', member.userId)"
            title="Eigentümerschaft übertragen"
          >
            <Crown :size="15" />
          </button>
        </div>
      </div>
    </div>

    <PageHeader class="mt-8"> Banned Users </PageHeader>

    <div
      v-if="loadingBanned && (!bannedUsers || bannedUsers.length === 0)"
      class="text-center p-8 text-on-surface-muted text-body"
    >
      Loading...
    </div>
    <div
      v-else-if="!bannedUsers || bannedUsers.length === 0"
      class="text-center p-8 text-on-surface-muted text-body"
    >
      No banned users.
    </div>
    <div v-else class="flex flex-col gap-1.5">
      <div v-for="user in bannedUsers" :key="user.userId" class="flex items-center justify-between p-2 px-3 bg-surface border border-surface-border shadow-input rounded-lg gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="font-semibold text-body whitespace-nowrap overflow-hidden text-ellipsis">{{ user.generatedName }}</span>
          <span class="text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-on-surface-muted"
            >Banned On
            {{ new Date(user.bannedAt).toLocaleDateString('de-DE') }}</span
          >
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <BaseButton variant="ghost" @click="emit('revert-ban', user.userId)">
            Unban
          </BaseButton>
        </div>
      </div>
    </div>

    <BaseModal
      v-if="removeModal.isOpen"
      @cancel="closeRemoveModal"
      :danger="true"
      :submit="confirmRemove"
    >
      <template #title>Remove Member</template>

      <template #content>
        <p>
          Are you sure you want to remove
          <strong>{{ removeModal.userName }}</strong> from the group?
        </p>
        <p>
          Users can rejoin at any time if they have the credentials for your
          group. To block them from doing so you can ban them.
        </p>

        <BaseCheckbox v-model="removeModal.ban"
          >Ban
          <strong>{{ removeModal.userName }}</strong> permanently</BaseCheckbox
        >
      </template>

      <template #action-text> Remove </template>
    </BaseModal>
  </div>
