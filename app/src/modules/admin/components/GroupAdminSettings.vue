<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import { Pencil } from '@lucide/vue';

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

  if (
    !confirm(
      'Sind Sie sicher, dass Sie diese Gruppe unwiderruflich löschen möchten?',
    )
  )
    return;

  deletingGroup.value = true;
  try {
    await deleteGroup();
    router.push('/home');
  } catch {
    deletingGroup.value = false;
  }
}
</script>

<template>
  <div class="tab-panel">
    <div v-if="!isAdmin" class="readonly">
      <p class="readonly-text">
        Nur Administratoren können die Einstellungen ändern.
      </p>
    </div>

    <!-- Name settings -->
    <div>
      <PageHeader>Gruppenname</PageHeader>
      <BaseLabel for="group-name">Name</BaseLabel>
      <div v-if="!editingGroupName" class="setting-value">
        <span>{{ groupName }}</span>
        <BaseTooltip :content="t('global.buttons.edit')">
          <BaseButton
            v-if="isAdmin"
            class="tiny"
            @click="emit('start-edit')"
            variant="ghost"
            on="canvas"
            :icon="Pencil"
          />
        </BaseTooltip>
      </div>

      <div v-else class="setting-edit">
        <BaseInput
          id="group-name"
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
        <BaseButton
          @click="emit('save-edit')"
          :disabled="savingGroupName || !newGroupName.trim() || !isAdmin"
          variant="action"
        >
          {{ savingGroupName ? 'Speichert...' : t('global.buttons.save') }}
        </BaseButton>
        <BaseButton @click="emit('cancel-edit')" variant="ghost">{{
          t('global.buttons.cancel')
        }}</BaseButton>
      </div>
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
      <h3 class="danger-title">Danger Zone</h3>
      <p class="danger-desc">
        Das Löschen der Gruppe ist endgültig und kann nicht rückgängig gemacht
        werden. Alle damit verbundenen Daten (Aufgaben, Klausuren, Ankündigungen
        etc.) werden für alle Benutzer gelöscht.
      </p>

      <BaseForm
        :submit="confirmDeleteGroup"
        :loading="deletingGroup"
        :requirement="deleteConfirmText === `delete ${groupName}`"
        :danger="true"
        class="max-w-100"
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
              class="danger-input"
              :placeholder="'delete ' + groupName"
            />
          </BaseFormGroup>
        </template>

        <template #action-text> Gruppe unwiderruflich löschen </template>
      </BaseForm>
    </div>
  </div>
</template>

<style scoped>
.tab-panel {
  animation: fadeUp 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.readonly-text {
  color: var(--color-on-surface-muted);
  font-size: var(--text-body);
  margin: 0;
  text-align: center;
}

.setting-value {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-value span {
  font-weight: 600;
  font-size: var(--text-body);
}

.setting-edit {
  display: flex;
  gap: 8px;
  align-items: center;
}

.setting-edit .input {
  flex: 1;
  max-width: 300px;
}

/* Password Form */
.form-group {
  margin-bottom: 16px;
  max-width: 400px;
}

.form-group label {
  display: block;
  font-size: var(--text-sub);
  color: var(--color-on-surface-muted);
  font-weight: 500;
  margin-bottom: 6px;
}

.error-text {
  color: var(--color-danger);
  font-size: var(--text-sub);
  margin: 0 0 16px;
}

.actions {
  margin-top: 24px;
}

.danger-title {
  color: var(--color-danger);
}

.danger-desc {
  font-size: var(--text-body);
  color: var(--color-on-surface-muted);
  margin: 0 0 20px;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .setting-edit {
    flex-wrap: wrap;
  }
  .setting-edit .input {
    max-width: none;
  }
}
</style>
