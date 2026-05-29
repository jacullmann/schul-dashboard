<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useGroupAdmin } from '@/modules/admin/composables/useGroupAdmin';
import { Pencil, Camera, Trash2, Upload } from '@lucide/vue';
import { useModalStore } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import hw from '../../../api/api';
import GroupAvatarCropper from './GroupAvatarCropper.vue';
import Avatar from '@/modules/auth/components/Avatar.vue';

const modalStore = useModalStore();
const { t } = useI18n();
const { activeGroupAvatarUrl, checkPermission } = useAppAuth();
const canEditSettings = computed(() => checkPermission('edit_group_general'));

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
const cameraInputRef = ref<HTMLInputElement | null>(null);
const cropperOpen = ref(false);
const selectedImageSrc = ref('');
const savingAvatar = ref(false);
const avatarError = ref('');
const isMenuOpen = ref(false);

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function triggerUploadAndClose() {
  isMenuOpen.value = false;
  triggerAvatarUpload();
}

function triggerCameraCaptureAndClose() {
  isMenuOpen.value = false;
  cameraInputRef.value?.click();
}

function deleteAvatarAndClose() {
  isMenuOpen.value = false;
  deleteAvatar();
}

function triggerAvatarUpload() {
  fileInputRef.value?.click();
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    avatarError.value = t('admin.general.avatar.errors.invalid_file');
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
    avatarError.value = t('admin.general.avatar.errors.read_failed');
  };
  reader.readAsDataURL(file);
}

async function onCropConfirmed(blob: Blob) {
  cropperOpen.value = false;
  savingAvatar.value = true;
  avatarError.value = '';

  try {
    const { data: sign } = await hw.post('/items/uploads/sign');

    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    const form = new FormData();
    form.set('file', file);
    form.set('api_key', sign.apiKey);
    form.set('timestamp', String(sign.timestamp));
    form.set('signature', sign.signature);
    form.set('folder', sign.folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
      {
        method: 'POST',
        body: form,
      },
    );

    if (!res.ok)
      throw new Error(t('admin.general.avatar.errors.upload_failed'));
    const json = await res.json();
    if (!json.secure_url)
      throw new Error(t('admin.general.avatar.errors.invalid_response'));

    await saveGroupAvatar(json.secure_url);
  } catch (err: any) {
    avatarError.value =
      err.message || t('admin.general.avatar.errors.save_failed');
  } finally {
    savingAvatar.value = false;
  }
}

async function deleteAvatar() {
  const isConfirmed = await modalStore.confirm({
    title: t('admin.general.avatar.delete_modal.title'),
    content: t('admin.general.avatar.delete_modal.message'),
    submitText: t('common.buttons.delete'),
    danger: true,
  });

  if (!isConfirmed) return;

  savingAvatar.value = true;
  avatarError.value = '';
  try {
    await saveGroupAvatar(null);
  } catch (err: any) {
    avatarError.value =
      err.message || t('admin.general.avatar.errors.delete_failed');
  } finally {
    savingAvatar.value = false;
  }
}

const oldPassword = ref('');
const newPassword = ref('');
const newPassword2 = ref('');
const changingPassword = ref(false);
const pwdError = ref('');

async function changePassword() {
  if (!oldPassword.value || !newPassword.value) return;
  if (newPassword.value !== newPassword2.value) {
    pwdError.value = t('admin.general.password.errors.mismatch');
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
    pwdError.value = err.message || t('admin.general.password.errors.generic');
  } finally {
    changingPassword.value = false;
  }
}

const deleteConfirmText = ref('');
const deletingGroup = ref(false);

async function confirmDeleteGroup() {
  const expectedConfirmation = `delete ${props.groupName}`;
  if (deleteConfirmText.value !== expectedConfirmation) return;

  const isConfirmed = await modalStore.confirm({
    title: t('admin.general.delete_group.modal.title'),
    content: t('admin.general.delete_group.modal.message'),
    submitText: t('common.buttons.delete'),
    danger: true,
  });

  if (!isConfirmed) return;

  deletingGroup.value = true;
  try {
    await deleteGroup();
    router.push('/groups');
  } catch (err) {
    // TODO: Add toast
    deletingGroup.value = false;
  }
}
</script>

<template>
  <div class="animate-fade-up flex flex-col gap-8">
    <div
      v-if="!canEditSettings"
      class="text-center text-base text-on-ghost-muted"
    >
      <p class="m-0">{{ t('admin.general.errors.unauthorized') }}</p>
    </div>

    <div>
      <PageHeader>{{ t('admin.general.appearance.title') }}</PageHeader>
      <div class="flex items-center gap-6">
        <!-- Avatar Preview Circle -->
        <div class="relative flex-shrink-0">
          <Avatar
            :name="groupName"
            :picture="activeGroupAvatarUrl"
            :size="24"
          />

          <BaseButton
            v-if="canEditSettings"
            variant="action"
            :icon="Pencil"
            size="sm"
            class="absolute! bottom-0 right-0"
            @click.stop="toggleMenu"
            :disabled="savingAvatar"
          />

          <div
            v-if="savingAvatar"
            class="absolute inset-0 bg-zinc-950/70 rounded-full flex items-center justify-center z-20"
          >
            <BaseSpinner />
          </div>

          <BaseMenu
            v-if="canEditSettings"
            :open="isMenuOpen"
            @close="isMenuOpen = false"
            class="left-0 mt-2 z-30 min-w-[180px]"
            @click.stop
          >
            <BaseMenuButton
              @click="triggerUploadAndClose"
              :icon="Upload"
              :disabled="savingAvatar"
            >
              Bild hochladen
            </BaseMenuButton>

            <BaseMenuButton
              @click="triggerCameraCaptureAndClose"
              :icon="Camera"
              :disabled="savingAvatar"
            >
              Bild aufnehmen
            </BaseMenuButton>

            <BaseMenuDivider v-if="activeGroupAvatarUrl" />

            <BaseMenuButton
              v-if="activeGroupAvatarUrl"
              variant="danger"
              @click="deleteAvatarAndClose"
              :icon="Trash2"
              :disabled="savingAvatar"
            >
              Bild löschen
            </BaseMenuButton>
          </BaseMenu>
        </div>

        <div class="flex-1 w-full flex flex-col">
          <BaseLabel for="group-name">{{
            t('admin.general.appearance.name_label')
          }}</BaseLabel>
          <div v-if="!editingGroupName" class="flex items-center gap-2 h-6">
            <span class="font-semibold text-xl">{{ groupName }}</span>
            <BaseTooltip :content="t('common.buttons.edit')">
              <BaseButton
                v-if="canEditSettings"
                class="w-8 h-8 p-0"
                @click="emit('start-edit')"
                variant="ghost"
                :icon="Pencil"
              />
            </BaseTooltip>
          </div>

          <template v-else>
            <div
              class="flex flex-col items-stretch sm:items-center gap-2 w-full max-w-[400px]"
            >
              <BaseInput
                id="group-name"
                class="flex-1"
                :value="newGroupName"
                @input="
                  emit(
                    'update:newGroupName',
                    ($event.target as HTMLInputElement).value,
                  )
                "
                :placeholder="t('admin.general.appearance.name_placeholder')"
                @keyup.enter="emit('save-edit')"
                :disabled="!canEditSettings"
              />
              <BaseRow justify="end" class="w-full mt-2">
                <BaseButton @click="emit('cancel-edit')" variant="ghost">{{
                  t('common.buttons.cancel')
                }}</BaseButton>
                <BaseButton
                  @click="emit('save-edit')"
                  :disabled="
                    savingGroupName || !newGroupName.trim() || !canEditSettings
                  "
                  variant="action"
                >
                  {{
                    savingGroupName
                      ? t('common.buttons.saving')
                      : t('common.buttons.save')
                  }}
                </BaseButton>
              </BaseRow>
            </div>
          </template>

          <span
            v-if="avatarError"
            class="text-xs text-danger font-medium mt-1"
            >{{ avatarError }}</span
          >
        </div>
      </div>

      <input
        type="file"
        ref="fileInputRef"
        accept="image/*"
        class="hidden"
        @change="onFileSelected"
      />

      <input
        type="file"
        ref="cameraInputRef"
        accept="image/*"
        capture="user"
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

    <div v-if="isOwner">
      <PageHeader>{{ t('admin.general.password.title') }}</PageHeader>

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
            <BaseLabel for="old-password">{{
              t('admin.general.password.current_label')
            }}</BaseLabel>
            <BaseInput
              id="old-password"
              type="password"
              v-model="oldPassword"
              @input="pwdError = ''"
            />
          </BaseFormGroup>

          <BaseFormGroup id="new-password">
            <BaseLabel for="new-password">{{
              t('admin.general.password.new_label')
            }}</BaseLabel>
            <BaseInput
              id="new-password"
              type="password"
              v-model="newPassword"
              @input="pwdError = ''"
            />
          </BaseFormGroup>

          <BaseFormGroup id="new-password-confirm">
            <BaseLabel for="new-password-confirm">{{
              t('admin.general.password.confirm_label')
            }}</BaseLabel>
            <BaseInput
              id="new-password-confirm"
              type="password"
              v-model="newPassword2"
              @input="pwdError = ''"
            />
          </BaseFormGroup>
        </template>

        <template #action-text>
          {{ t('admin.general.password.title') }}
        </template>
      </BaseForm>
    </div>

    <div v-if="isOwner">
      <h3 class="text-danger">
        {{ t('admin.general.delete_group.danger_zone_title') }}
      </h3>
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

        <template #action-text>
          {{ t('admin.general.delete_group.submit_button') }}
        </template>
      </BaseForm>
    </div>
  </div>
</template>
