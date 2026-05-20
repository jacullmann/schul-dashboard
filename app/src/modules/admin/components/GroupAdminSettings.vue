<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import { Pencil, Camera } from '@lucide/vue';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { getAvatarData } from '@/modules/auth/utils/avatar';
import hw from '@/api/hwApi';
import GroupAvatarCropper from './GroupAvatarCropper.vue';

const modalStore = useModalStore();
const { t } = useI18n();
const { activeGroupAvatarUrl } = useAppAuth();

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

const { updateGroupPassword, deleteGroup, saveGroupAvatar } = useGroupAdmin();
const router = useRouter();

// Avatar/Cropper state
const fileInputRef = ref<HTMLInputElement | null>(null);
const cropperOpen = ref(false);
const selectedImageSrc = ref('');
const savingAvatar = ref(false);
const avatarError = ref('');

const avatarData = computed(() => getAvatarData(props.groupName));

function triggerAvatarUpload() {
  fileInputRef.value?.click();
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    avatarError.value = 'Bitte wählen Sie eine gültige Bilddatei aus.';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    selectedImageSrc.value = event.target?.result as string;
    cropperOpen.value = true;
    input.value = '';
    avatarError.value = '';
  };
  reader.onerror = () => {
    avatarError.value = 'Fehler beim Lesen der Datei.';
  };
  reader.readAsDataURL(file);
}

async function onCropConfirmed(blob: Blob) {
  cropperOpen.value = false;
  savingAvatar.value = true;
  avatarError.value = '';

  try {
    // 1. Get secure signature for Cloudinary upload
    const { data: sign } = await hw.post('/api/items/uploads/sign');

    // 2. Prepare FormData
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    const form = new FormData();
    form.set('file', file);
    form.set('api_key', sign.apiKey);
    form.set('timestamp', String(sign.timestamp));
    form.set('signature', sign.signature);
    form.set('folder', sign.folder);

    // 3. Upload directly to Cloudinary
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
      {
        method: 'POST',
        body: form,
      }
    );

    if (!res.ok) throw new Error('Cloudinary Upload fehlgeschlagen');
    const json = await res.json();
    if (!json.secure_url) throw new Error('Ungültige Antwort von Cloudinary');

    // 4. Save Cloudinary secure URL to DB
    await saveGroupAvatar(json.secure_url);
  } catch (err: any) {
    avatarError.value = err.message || 'Fehler beim Hochladen des Profilbildes.';
  } finally {
    savingAvatar.value = false;
  }
}

async function deleteAvatar() {
  const isConfirmed = await modalStore.confirm({
    title: 'Gruppenbild löschen',
    content: 'Sind Sie sicher, dass Sie das Gruppen-Profilbild löschen möchten?',
    submitText: t('global.buttons.delete') || 'Löschen',
    danger: true,
  });

  if (!isConfirmed) return;

  savingAvatar.value = true;
  avatarError.value = '';
  try {
    await saveGroupAvatar(null);
  } catch (err: any) {
    avatarError.value = err.message || 'Fehler beim Löschen des Profilbildes.';
  } finally {
    savingAvatar.value = false;
  }
}

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

    <!-- Gruppenbild settings -->
    <div>
      <PageHeader>Gruppenbild</PageHeader>
      <div class="flex flex-col sm:flex-row items-center gap-6 mt-4">
        <!-- Avatar Preview Circle -->
        <div class="relative flex-shrink-0">
          <div
            class="relative size-24 rounded-full overflow-hidden bg-zinc-900/40 flex items-center justify-center select-none"
            :style="!activeGroupAvatarUrl ? { backgroundColor: avatarData.color } : {}"
          >
            <img
              v-if="activeGroupAvatarUrl"
              :src="activeGroupAvatarUrl"
              alt="Gruppenbild"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-3xl font-bold text-white">{{ avatarData.letter }}</span>

            <!-- Admin Hover Overlay -->
            <button
              v-if="isAdmin"
              class="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white cursor-pointer border-none p-0"
              @click="triggerAvatarUpload"
              :disabled="savingAvatar"
            >
              <Camera class="w-5 h-5 mb-1" />
              <span class="text-[9px] uppercase font-bold tracking-wider">Ändern</span>
            </button>
          </div>

          <!-- Upload / Crop progress indicator -->
          <div
            v-if="savingAvatar"
            class="absolute inset-0 bg-zinc-950/70 rounded-full flex items-center justify-center"
          >
            <BaseSpinner />
          </div>
        </div>

        <div class="flex-1 flex flex-col gap-2 text-center sm:text-left">
          <div v-if="isAdmin" class="flex flex-wrap gap-2 justify-center sm:justify-start">
            <BaseButton
              variant="ghost"
              @click="triggerAvatarUpload"
              :disabled="savingAvatar"
            >
              Bild hochladen
            </BaseButton>
            <BaseButton
              v-if="activeGroupAvatarUrl"
              variant="ghost"
              class="text-danger hover:bg-danger/10"
              @click="deleteAvatar"
              :disabled="savingAvatar"
            >
              Bild löschen
            </BaseButton>
          </div>
          <p class="text-xs text-on-ghost-muted m-0">
            Laden Sie ein Bild hoch. Das Bild wird kreisförmig zugeschnitten und als Profilbild Ihrer Gruppe angezeigt.
          </p>
          <span v-if="avatarError" class="text-xs text-danger font-medium">{{ avatarError }}</span>
        </div>
      </div>

      <input
        type="file"
        ref="fileInputRef"
        accept="image/*"
        class="hidden"
        @change="onFileSelected"
      />

      <GroupAvatarCropper
        :open="cropperOpen"
        :image-src="selectedImageSrc"
        @cancel="cropperOpen = false"
        @confirm="onCropConfirmed"
      />
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
      <p class="text-base/relaxed text-on-ghost-muted m-0 mb-5">
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
