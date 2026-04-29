<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import { Pencil } from '@lucide/vue';
import { useModalStore } from '@/stores/modalStore';

const modalStore = useModalStore();
const { t } = useI18n();

const props = defineProps<{
  isAdmin: boolean;
  isOwner?: boolean;
  groupName: string;
  newGroupName: string;
  editingGroupName: boolean;
  savingGroupName: boolean;
}>();

const emit = defineEmits<{
  (e: 'start-edit'): void;
  (e: 'cancel-edit'): void;
  (e: 'save-edit'): void;
  (e: 'update:newGroupName', value: string): void;
}>();

const { updateGroupPassword, deleteGroup } = useGroupAdmin();
const router = useRouter();

// Password state
const oldPassword = ref('');
const newPassword = ref('');
const newPassword2 = ref('');
const changingPassword = ref(false);
const pwdError = ref('');

async function changePassword() {
  if (!oldPassword.value || !newPassword.value) return;
  if (newPassword.value !== newPassword2.value) {
    pwdError.value = 'Passwörter stimmen nicht überein';
    return;
  }
  pwdError.value = '';
  changingPassword.value = true;
  try {
    await updateGroupPassword(oldPassword.value, newPassword.value);
    oldPassword.value = '';
    newPassword.value = '';
    newPassword2.value = '';
  } catch (err: any) {
    pwdError.value = err.message || 'Ein Fehler ist aufgetreten';
  } finally {
    changingPassword.value = false;
  }
}

// Delete group state
const deleteConfirmText = ref('');
const deletingGroup = ref(false);

async function confirmDeleteGroup() {
  const expectedConfirmation = `delete ${props.groupName}`;
  if (deleteConfirmText.value !== expectedConfirmation) return;

  const isConfirmed = await modalStore.confirm({
    title: 'Gruppe löschen',
    content:
      'Sind Sie sicher, dass Sie diese Gruppe unwiderruflich löschen möchten?',
    submitText: t('global.buttons.delete'),
    danger: true,
  });

  if (!isConfirmed) return;

  deletingGroup.value = true;
  try {
    await deleteGroup();
    router.push('/home');
  } catch (err) {
    // TODO: Add toast
    deletingGroup.value = false;
  }
}
</script>

<template>
  <div class="animate-fade-up flex flex-col gap-4">
    <div v-if="!isAdmin" class="text-center text-base text-on-ghost-muted">
      <p class="m-0">Nur Administratoren können die Einstellungen ändern.</p>
    </div>

    <!-- Name settings -->
    <div>
      <PageHeader>Gruppenname</PageHeader>
      <BaseLabel for="group-name">Name</BaseLabel>
      <div v-if="!editingGroupName" class="flex items-center gap-3">
        <span class="font-semibold text-base">{{ groupName }}</span>
        <BaseTooltip :content="t('global.buttons.edit')">
          <BaseButton
            v-if="isAdmin"
            class="w-8 h-8 p-0"
            @click="emit('start-edit')"
            variant="ghost"
            :icon="Pencil"
          />
        </BaseTooltip>
      </div>

      <template v-else>
        <BaseInput
          id="group-name"
          class="flex-1 max-w-[300px] sm:max-w-none"
          :value="newGroupName"
          @input="
            emit(
              'update:newGroupName',
              ($event.target as HTMLInputElement).value,
            )
          "
          placeholder="Neuer Gruppenname"
          @keyup.enter="emit('save-edit')"
          :disabled="!isAdmin"
        />
        <BaseRow justify="end" class="w-full mt-2">
          <BaseButton @click="emit('cancel-edit')" variant="ghost">{{
            t('global.buttons.cancel')
          }}</BaseButton>
          <BaseButton
            @click="emit('save-edit')"
            :disabled="savingGroupName || !newGroupName.trim() || !isAdmin"
            variant="action"
          >
            {{ savingGroupName ? 'Speichert...' : t('global.buttons.save') }}
          </BaseButton>
        </BaseRow>
      </template>
    </div>

    <!-- Password settings -->
    <div v-if="isOwner">
      <PageHeader>Passwort ändern</PageHeader>

      <BaseForm
        :submit="changePassword"
        :error="pwdError"
        :loading="changingPassword"
        :requirement="
          !!(
            oldPassword &&
            newPassword &&
            newPassword2 &&
            newPassword === newPassword2
          )
        "
        class="max-w-160"
      >
        <template #content>
          <BaseFormGroup id="old-password">
            <BaseLabel for="old-password">Aktuelles Passwort</BaseLabel>
            <BaseInput
              id="old-password"
              type="password"
              v-model="oldPassword"
              @input="pwdError = ''"
            />
          </BaseFormGroup>

          <BaseFormGroup id="new-password">
            <BaseLabel for="new-password">Neues Passwort</BaseLabel>
            <BaseInput
              id="new-password"
              type="password"
              v-model="newPassword"
              @input="pwdError = ''"
            />
          </BaseFormGroup>

          <BaseFormGroup id="new-password-confirm">
            <BaseLabel for="new-password-confirm"
              >Neues Passwort bestätigen</BaseLabel
            >
            <BaseInput
              id="new-password-confirm"
              type="password"
              v-model="newPassword2"
              @input="pwdError = ''"
            />
          </BaseFormGroup>
        </template>

        <template #action-text> Passwort ändern </template>
      </BaseForm>
    </div>

    <!-- Danger Zone: Delete Group -->
    <div v-if="isOwner">
      <h3 class="text-danger">Danger Zone</h3>
      <p class="text-base text-on-ghost-muted m-0 mb-5 leading-[1.5]">
        Das Löschen der Gruppe ist endgültig und kann nicht rückgängig gemacht
        werden. Alle damit verbundenen Daten (Aufgaben, Klausuren, Ankündigungen
        etc.) werden für alle Benutzer gelöscht.
      </p>

      <BaseForm
        :submit="confirmDeleteGroup"
        :loading="deletingGroup"
        :requirement="deleteConfirmText === `delete ${groupName}`"
        :danger="true"
        class="max-w-160"
      >
        <template #content>
          <BaseFormGroup id="delete-confirm">
            <BaseLabel for="delete-confirm"
              >Bitte geben Sie <strong>delete {{ groupName }}</strong> ein, um
              fortzufahren:
            </BaseLabel>
            <BaseInput
              id="delete-confirm"
              v-model="deleteConfirmText"
              type="text"
              class="border-danger"
              :placeholder="'delete ' + groupName"
            />
          </BaseFormGroup>
        </template>

        <template #action-text> Gruppe unwiderruflich löschen </template>
      </BaseForm>
    </div>
  </div>
</template>
