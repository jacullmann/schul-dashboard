<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Eye, EyeOff } from 'lucide-vue-next';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import LoadingSpinner from '@/common/components/LoadingSpinner.vue';

const { t } = useI18n();

const props = defineProps<{
  isAdmin: boolean;
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

// Password state
const oldPassword = ref('');
const newPassword = ref('');
const newPassword2 = ref('');
const showOld = ref(false);
const showNew = ref(false);
const showNew2 = ref(false);
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
  if (deleteConfirmText.value !== props.groupName) return;
  
  if (!confirm('Sind Sie sicher, dass Sie diese Gruppe unwiderruflich löschen möchten?')) return;
  
  deletingGroup.value = true;
  try {
    await deleteGroup();
    window.location.href = '/account/groups';
  } catch {
    deletingGroup.value = false;
  }
}
</script>

<template>
  <div class="tab-panel">
    
    <div v-if="!isAdmin" class="settings-card readonly">
      <p class="readonly-text">Nur Administratoren können die Einstellungen ändern.</p>
    </div>

    <!-- Name settings -->
    <div class="settings-card">
      <h3>Gruppenname</h3>
      <div class="setting-row">
        <label>Name</label>
        <div v-if="!editingGroupName" class="setting-value">
          <span>{{ groupName }}</span>
          <button v-if="isAdmin" class="btn ghost tiny" @click="emit('start-edit')">{{ t('global.buttons.edit') }}</button>
        </div>
        <div v-else class="setting-edit">
          <input 
            :value="newGroupName"
            @input="emit('update:newGroupName', ($event.target as HTMLInputElement).value)"
            class="input" 
            placeholder="Neuer Gruppenname" 
            @keyup.enter="emit('save-edit')" 
            :disabled="!isAdmin"
          />
          <button class="btn action" @click="emit('save-edit')" :disabled="savingGroupName || !newGroupName.trim() || !isAdmin">
            {{ savingGroupName ? 'Speichert...' : t('global.buttons.save') }}
          </button>
          <button class="btn ghost" @click="emit('cancel-edit')">{{ t('global.buttons.cancel') }}</button>
        </div>
      </div>
    </div>

    <!-- Password settings -->
    <div v-if="isAdmin" class="settings-card">
      <h3>Passwort ändern</h3>
      
      <div class="form-group">
        <label>Aktuelles Passwort</label>
        <div class="input-wrapper">
          <input 
            :type="showOld ? 'text' : 'password'" 
            v-model="oldPassword" 
            class="input"
            @input="pwdError = ''"
          />
          <button class="toggle-btn" @click="showOld = !showOld">
            <component :is="showOld ? EyeOff : Eye" :size="18" />
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label>Neues Passwort</label>
        <div class="input-wrapper">
          <input 
            :type="showNew ? 'text' : 'password'" 
            v-model="newPassword" 
            class="input"
            @input="pwdError = ''"
          />
          <button class="toggle-btn" @click="showNew = !showNew">
            <component :is="showNew ? EyeOff : Eye" :size="18" />
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label>Neues Passwort bestätigen</label>
        <div class="input-wrapper">
          <input 
            :type="showNew2 ? 'text' : 'password'" 
            v-model="newPassword2" 
            class="input"
            @input="pwdError = ''"
          />
          <button class="toggle-btn" @click="showNew2 = !showNew2">
            <component :is="showNew2 ? EyeOff : Eye" :size="18" />
          </button>
        </div>
      </div>

      <p v-if="pwdError" class="error-text">{{ pwdError }}</p>

      <div class="actions">
        <button 
          class="btn action" 
          @click="changePassword" 
          :disabled="changingPassword || !oldPassword || !newPassword || newPassword !== newPassword2"
        >
          <LoadingSpinner v-if="changingPassword" size="1.2em" />
          <span v-else>Passwort ändern</span>
        </button>
      </div>
    </div>

    <!-- Danger Zone: Delete Group -->
    <div v-if="isAdmin" class="settings-card danger-zone">
      <h3 class="danger-title">Danger Zone</h3>
      <p class="danger-desc">
        Das Löschen der Gruppe ist endgültig und kann nicht rückgängig gemacht werden. 
        Alle damit verbundenen Daten (Aufgaben, Klausuren, Ankündigungen etc.) werden für alle Benutzer gelöscht.
      </p>
      
      <div class="delete-confirmation">
        <label>Bitte geben Sie <strong>{{ groupName }}</strong> ein, um fortzufahren:</label>
        <input 
          v-model="deleteConfirmText" 
          type="text" 
          class="input danger-input" 
          :placeholder="groupName"
        />
        <button 
          class="btn danger" 
          :disabled="deleteConfirmText !== groupName || deletingGroup"
          @click="confirmDeleteGroup"
        >
          <LoadingSpinner v-if="deletingGroup" size="1.2em" />
          <span v-else>Gruppe unwiderruflich löschen</span>
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.tab-panel {
  animation: fadeUp 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.readonly-text {
  color: var(--sub);
  font-size: var(--font-size-body);
  margin: 0;
  text-align: center;
}

.settings-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-surface);
  box-shadow: var(--input-shadow);
  border-radius: 12px;
  padding: 24px;
}

.settings-card h3 {
  font-size: var(--font-size-title);
  font-weight: 600;
  margin: 0 0 20px;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-row label {
  font-size: var(--font-size-sub);
  color: var(--sub);
  font-weight: 500;
}

.setting-value {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-value span {
  font-weight: 600;
  font-size: var(--font-size-body);
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
  font-size: var(--font-size-sub);
  color: var(--sub);
  font-weight: 500;
  margin-bottom: 6px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper .input {
  width: 100%;
  padding-right: 40px;
}

.toggle-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--sub);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.toggle-btn:hover {
  color: var(--text-default);
}

.error-text {
  color: var(--danger);
  font-size: var(--font-size-sub);
  margin: 0 0 16px;
}

.actions {
  margin-top: 24px;
}

/* Danger Zone */
.danger-zone {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.02);
}

.danger-title {
  color: var(--danger);
}

.danger-desc {
  font-size: var(--font-size-body);
  color: var(--sub);
  margin: 0 0 20px;
  line-height: 1.5;
}

.delete-confirmation {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
}

.delete-confirmation label {
  font-size: var(--font-size-sub);
  color: var(--text-default);
}

.delete-confirmation .danger-input {
  border-color: rgba(239, 68, 68, 0.3);
}

.delete-confirmation .danger-input:focus {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.btn.danger {
  background: var(--danger);
  color: #fff;
  border: none;
}

.btn.danger:hover:not(:disabled) {
  background: #dc2626; /* slightly darker red */
}

@media (max-width: 640px) {
  .setting-edit { flex-wrap: wrap; }
  .setting-edit .input { max-width: none; }
  .settings-card { padding: 16px; }
}
</style>
