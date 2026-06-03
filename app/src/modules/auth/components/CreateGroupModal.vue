<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useUserStore } from '@/stores/userStore';
import { Pencil, Camera, Trash2, Upload } from '@lucide/vue';
import GroupAvatarCropper from '@/modules/admin/components/GroupAvatarCropper.vue';
import Avatar from '@/modules/auth/components/Avatar.vue';
import hw from '@/api/api.ts';

const { t } = useI18n();

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

const router = useRouter();
const auth = useAppAuth();
const userStore = useUserStore();
const { activeGroupId } = useAppAuth();

const groupNameInputRef = ref<HTMLInputElement | null>(null);

const groupName = ref('');
const submitting = ref(false);
const errorMsg = ref('');

// Avatar/Cropper state
const fileInputRef = ref<HTMLInputElement | null>(null);
const cameraInputRef = ref<HTMLInputElement | null>(null);
const cropperOpen = ref(false);
const selectedImageSrc = ref('');
const savingAvatar = ref(false);
const avatarError = ref('');
const isMenuOpen = ref(false);
const avatarUrl = ref<string | null>(null);

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function triggerUploadAndClose() {
  isMenuOpen.value = false;
  fileInputRef.value?.click();
}

function triggerCameraCaptureAndClose() {
  isMenuOpen.value = false;
  cameraInputRef.value?.click();
}

function deleteAvatar() {
  isMenuOpen.value = false;
  avatarUrl.value = null;
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    avatarError.value =
      t('admin.general.avatar.errors.invalid_file') || 'Ungültiges Dateiformat';
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
    avatarError.value =
      t('admin.general.avatar.errors.read_failed') ||
      'Fehler beim Lesen der Datei';
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
      throw new Error(
        t('admin.general.avatar.errors.upload_failed') ||
          'Upload fehlgeschlagen',
      );
    const json = await res.json();
    if (!json.secure_url)
      throw new Error(
        t('admin.general.avatar.errors.invalid_response') ||
          'Ungültige Serverantwort',
      );

    avatarUrl.value = json.secure_url;
  } catch (err: any) {
    avatarError.value =
      err.message ||
      t('admin.general.avatar.errors.save_failed') ||
      'Fehler beim Speichern';
  } finally {
    savingAvatar.value = false;
  }
}

const isValid = computed(() => {
  return groupName.value.trim().length > 0;
});

function clearError() {
  errorMsg.value = '';
}

onMounted(() => {
  setTimeout(() => {
    groupNameInputRef.value?.focus();
  }, 100);
});

async function submit() {
  if (!isValid.value || submitting.value) return;

  submitting.value = true;
  errorMsg.value = '';

  try {
    const res = await auth.createGroup(
      groupName.value.trim(),
      avatarUrl.value || undefined,
    );

    if (res.ok) {
      try {
        await userStore.fetchUser();
      } catch {}

      emit('cancel');
      await router.push(`/groups/${activeGroupId.value}/dashboard`);
    } else {
      errorMsg.value = res.error || t('auth.groups.errors.create_failed');
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } };
    errorMsg.value = e.response?.data?.error || t('common.errors.unknown');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    @cancel="$emit('cancel')"
    :submit="submit"
    :loading="submitting"
    :error="errorMsg"
    :cancel="undefined"
  >
    <template #title>{{ t('common.groups.create_group') }}</template>

    <template #content>
      <div class="flex flex-col items-center gap-4 mb-6">
        <!-- Avatar Preview Circle -->
        <div class="relative flex-shrink-0 cursor-pointer" @click="toggleMenu">
          <Avatar
            :name="groupName || 'Group'"
            :picture="avatarUrl"
            :size="24"
          />

          <BaseButton
            type="button"
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

            <BaseMenuDivider v-if="avatarUrl" />

            <BaseMenuButton
              v-if="avatarUrl"
              variant="danger"
              @click="deleteAvatar"
              :icon="Trash2"
              :disabled="savingAvatar"
            >
              Bild löschen
            </BaseMenuButton>
          </BaseMenu>
        </div>
        <span class="text-xs text-on-ghost-muted">{{
          t('admin.general.avatar.description') ||
          'Optionally choose a group picture'
        }}</span>
        <span v-if="avatarError" class="text-xs text-danger font-medium">{{
          avatarError
        }}</span>
      </div>

      <BaseFormGroup id="group-name">
        <BaseLabel for="group-name">Gruppenname</BaseLabel>
        <BaseInput
          id="group-name"
          ref="groupNameInputRef"
          v-model="groupName"
          :placeholder="t('admin.general.appearance.name_placeholder')"
          type="text"
          autocomplete="off"
          @input="clearError"
        />
      </BaseFormGroup>

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
    </template>

    <template #action-text> {{ t('common.buttons.create') }} </template>
  </BaseModal>
</template>
