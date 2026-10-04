<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useGroupGeneralSettings } from '@/modules/groups/composables/useGroupGeneralSettings';
import { useGroupSettingsAccess } from '@/modules/groups/composables/useGroupSettingsAccess';
import { Pencil, Camera, Trash2, Upload } from '@lucide/vue';
import { useConfirmModal } from '@/stores/modalStore';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { uploadGroupAvatar } from '@/api/files';
import GroupAvatarCropper from './GroupAvatarCropper.vue';
import GroupTypeRadioGroup from './GroupTypeRadioGroup.vue';
import DeleteGroupModal from './DeleteGroupModal.vue';
import Avatar from '@/modules/auth/components/Avatar.vue';
import { GROUP_NAME_MAX_LENGTH, type GroupType } from '@/types/groups';

const confirmModal = useConfirmModal();
const { t } = useI18n();
const {
  activeGroupAvatarUrl,
  activeGroupType,
  activeGroupDaltonEnabled,
  checkPermission,
  checkAuthStatus,
} = useAppAuth();
const canEditSettings = computed(() => checkPermission('edit_group_general'));

// Switching the type or Dalton rewires subjects and the schedule, so it takes
// the rights for both on top of the general settings permission.
const canEditGroupType = computed(
  () =>
    canEditSettings.value &&
    checkPermission('edit_subjects_courses') &&
    checkPermission('edit_schedule'),
);

const { hasOwnerRights } = useGroupSettingsAccess();
const {
  groupName,
  editingGroupName,
  newGroupName,
  savingGroupName,
  startEditGroupName,
  cancelEditGroupName,
  saveGroupName: submitGroupName,
  saveGroupAvatar,
  savingGroupType,
  saveGroupType,
  savingDaltonEnabled,
  saveDaltonEnabled,
  deleteGroup,
} = useGroupGeneralSettings();

const groupNameInputRef = ref<HTMLInputElement | null>(null);

watch(
  editingGroupName,
  (editing) => {
    if (editing) groupNameInputRef.value?.focus();
  },
  { flush: 'post' },
);

// The name text doubles as the sizer for the inline input, so it mirrors the
// draft while editing and keeps showing the saved draft until the refreshed
// group name arrives, avoiding a flash of the old name.
const groupNameText = computed(() => {
  if (editingGroupName.value)
    return (
      newGroupName.value ||
      t('groups.settings.general.appearance.name_placeholder')
    );
  if (savingGroupName.value) return newGroupName.value.trim();
  return groupName.value;
});

const canSaveGroupName = computed(
  () =>
    canEditSettings.value &&
    !savingGroupName.value &&
    !!newGroupName.value.trim(),
);

function saveGroupName() {
  if (canSaveGroupName.value) void submitGroupName();
}

const router = useRouter();

const groupTypeInput = ref<GroupType>(activeGroupType.value);

watch(activeGroupType, (type) => {
  groupTypeInput.value = type;
});

const groupTypeChanged = computed(
  () => groupTypeInput.value !== activeGroupType.value,
);

async function confirmGroupTypeChange() {
  if (!groupTypeChanged.value) return;

  const target = groupTypeInput.value;
  const isConfirmed = await confirmModal.ask({
    title: t('groups.settings.general.group_type.modal.title'),
    content: t(`groups.settings.general.group_type.modal.message_${target}`),
    submitText: t('common.buttons.save'),
  });

  if (!isConfirmed) {
    groupTypeInput.value = activeGroupType.value;
    return;
  }

  const ok = await saveGroupType(target);
  if (!ok) groupTypeInput.value = activeGroupType.value;
}

const daltonInput = ref(activeGroupDaltonEnabled.value);

watch(activeGroupDaltonEnabled, (enabled) => {
  daltonInput.value = enabled;
});

const daltonChanged = computed(
  () => daltonInput.value !== activeGroupDaltonEnabled.value,
);

async function confirmDaltonChange() {
  if (!daltonChanged.value) return;

  const target = daltonInput.value;

  // Disabling removes every Dalton lesson from the schedule.
  if (!target) {
    const isConfirmed = await confirmModal.ask({
      title: t('groups.settings.general.dalton.modal.title'),
      content: t('groups.settings.general.dalton.modal.message'),
      submitText: t('common.buttons.save'),
      danger: true,
    });

    if (!isConfirmed) {
      daltonInput.value = activeGroupDaltonEnabled.value;
      return;
    }
  }

  const ok = await saveDaltonEnabled(target);
  if (!ok) daltonInput.value = activeGroupDaltonEnabled.value;
}

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
  void deleteAvatar();
}

function triggerAvatarUpload() {
  fileInputRef.value?.click();
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    avatarError.value = t('groups.settings.general.avatar.errors.invalid_file');
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
    avatarError.value = t('groups.settings.general.avatar.errors.read_failed');
  };
  reader.readAsDataURL(file);
}

async function onCropConfirmed(blob: Blob) {
  cropperOpen.value = false;
  savingAvatar.value = true;
  avatarError.value = '';

  try {
    const upload = await uploadGroupAvatar(blob).catch(() => {
      throw new Error(t('groups.settings.general.avatar.errors.upload_failed'));
    });

    await saveGroupAvatar(upload.id);
  } catch (err: any) {
    avatarError.value =
      err.message || t('groups.settings.general.avatar.errors.save_failed');
  } finally {
    savingAvatar.value = false;
  }
}

async function deleteAvatar() {
  const isConfirmed = await confirmModal.ask({
    title: t('groups.settings.general.avatar.delete_modal.title'),
    content: t('groups.settings.general.avatar.delete_modal.message'),
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
      err.message || t('groups.settings.general.avatar.errors.delete_failed');
  } finally {
    savingAvatar.value = false;
  }
}

const deleteModalOpen = ref(false);
const deletingGroup = ref(false);

async function confirmDeleteGroup() {
  deletingGroup.value = true;
  if (!(await deleteGroup())) {
    deletingGroup.value = false;
    return;
  }

  deleteModalOpen.value = false;
  await checkAuthStatus();
  void router.push({ name: 'groups' });
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div
      v-if="!canEditSettings"
      class="text-center text-base text-on-ghost-muted"
    >
      <p class="m-0">{{ t('groups.settings.general.errors.unauthorized') }}</p>
    </div>

    <div>
      <PageHeader>{{
        t('groups.settings.general.appearance.title')
      }}</PageHeader>
      <div class="flex items-center gap-6">
        <!-- Avatar Preview Circle -->
        <div class="relative flex-shrink-0">
          <button
            v-if="canEditSettings"
            type="button"
            class="group relative block rounded-full cursor-pointer outline-none transition-focus focus-visible:shadow-focus-ring disabled:cursor-not-allowed"
            :aria-label="t('groups.settings.general.avatar.actions.change')"
            aria-haspopup="menu"
            :aria-expanded="isMenuOpen"
            :disabled="savingAvatar"
            @click.stop="toggleMenu"
          >
            <Avatar
              :name="groupName"
              :picture="activeGroupAvatarUrl"
              :size="24"
            />
            <span
              class="absolute bottom-0 right-0 flex p-2 rounded-full bg-action text-on-action ring-4 ring-canvas transition-hover group-hover:bg-action-hover group-active:bg-action-hover group-disabled:opacity-50"
              aria-hidden="true"
            >
              <Pencil :size="18" />
            </span>
          </button>

          <Avatar
            v-else
            :name="groupName"
            :picture="activeGroupAvatarUrl"
            :size="24"
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
            class="left-0 mt-2 z-30 min-w-45"
            @close="isMenuOpen = false"
            @click.stop
          >
            <BaseMenuButton
              :icon="Upload"
              :disabled="savingAvatar"
              @click="triggerUploadAndClose"
            >
              {{ t('groups.settings.general.avatar.actions.upload') }}
            </BaseMenuButton>

            <BaseMenuButton
              :icon="Camera"
              :disabled="savingAvatar"
              @click="triggerCameraCaptureAndClose"
            >
              {{ t('groups.settings.general.avatar.actions.capture') }}
            </BaseMenuButton>

            <BaseMenuDivider v-if="activeGroupAvatarUrl" />

            <BaseMenuButton
              v-if="activeGroupAvatarUrl"
              variant="danger"
              :icon="Trash2"
              :disabled="savingAvatar"
              @click="deleteAvatarAndClose"
            >
              {{ t('groups.settings.general.avatar.actions.delete') }}
            </BaseMenuButton>
          </BaseMenu>
        </div>

        <div class="flex-1 min-w-0 flex flex-col">
          <BaseLabel for="group-name">{{
            t('groups.settings.general.appearance.name_label')
          }}</BaseLabel>
          <div
            class="flex items-center gap-2 min-h-10 max-md:grid max-md:grid-cols-[repeat(2,minmax(0,auto))]"
            :class="{ 'max-md:justify-start': !editingGroupName }"
          >
            <div
              class="relative max-w-full justify-self-start font-semibold text-xl"
              :class="
                editingGroupName
                  ? 'min-w-48 max-md:col-span-2 max-md:w-full'
                  : 'min-w-0'
              "
            >
              <span
                class="block overflow-hidden text-ellipsis whitespace-pre"
                :class="{ invisible: editingGroupName }"
                :aria-hidden="editingGroupName"
                >{{ groupNameText }}</span
              >
              <input
                v-if="editingGroupName"
                id="group-name"
                ref="groupNameInputRef"
                v-model="newGroupName"
                class="peer absolute inset-0 w-full p-0 bg-transparent border-0 outline-none placeholder:text-on-ghost-subtle"
                autocomplete="off"
                :maxlength="GROUP_NAME_MAX_LENGTH"
                :placeholder="
                  t('groups.settings.general.appearance.name_placeholder')
                "
                :readonly="savingGroupName"
                @keydown.enter.prevent="saveGroupName"
                @keydown.esc.stop="cancelEditGroupName"
              />
              <Transition
                enter-from-class="scale-x-0"
                leave-to-class="scale-x-0"
              >
                <span
                  v-if="editingGroupName"
                  class="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full origin-left bg-ghost-border peer-focus:bg-focus transition-[scale,background-color] duration-(--duration-focus) ease-(--ease-settle)"
                  aria-hidden="true"
                />
              </Transition>
            </div>

            <Transition
              v-if="canEditSettings"
              mode="out-in"
              enter-active-class="transition-[opacity,scale] duration-(--duration-focus) ease-(--ease-settle)"
              enter-from-class="opacity-0 scale-90"
              leave-active-class="transition-[opacity,scale] duration-(--duration-hover) ease-(--ease-focus)"
              leave-to-class="opacity-0 scale-90"
            >
              <BaseTooltip
                v-if="!editingGroupName"
                :content="t('common.buttons.edit')"
              >
                <BaseButton
                  variant="ghost"
                  :icon="Pencil"
                  :aria-label="t('common.buttons.edit')"
                  @click="startEditGroupName"
                />
              </BaseTooltip>

              <BaseRow
                v-else
                justify="end"
                class="shrink-0 flex-nowrap max-md:col-span-2"
              >
                <BaseButton variant="ghost" @click="cancelEditGroupName">{{
                  t('common.buttons.cancel')
                }}</BaseButton>
                <BaseButton
                  :disabled="!canSaveGroupName"
                  variant="action"
                  @click="saveGroupName"
                >
                  {{
                    savingGroupName
                      ? t('common.buttons.saving')
                      : t('common.buttons.save')
                  }}
                </BaseButton>
              </BaseRow>
            </Transition>
          </div>

          <span
            v-if="avatarError"
            class="text-xs text-danger font-medium mt-1"
            >{{ avatarError }}</span
          >
        </div>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileSelected"
      />

      <input
        ref="cameraInputRef"
        type="file"
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

    <div>
      <PageHeader>{{
        t('groups.settings.general.group_type.title')
      }}</PageHeader>
      <p class="text-base/relaxed text-on-ghost-muted m-0 mb-4 max-w-160">
        {{ t('groups.settings.general.group_type.description') }}
      </p>

      <BaseFormContent class="max-w-120">
        <GroupTypeRadioGroup
          v-model="groupTypeInput"
          :disabled="!canEditGroupType || savingGroupType"
        />

        <BaseRow
          v-if="canEditGroupType"
          stack-on-mobile
          justify="end"
          class="w-full mt-2 gap-2"
        >
          <BaseButton
            form
            variant="ghost"
            :disabled="!groupTypeChanged || savingGroupType"
            @click="groupTypeInput = activeGroupType"
          >
            {{ t('common.buttons.cancel') }}
          </BaseButton>
          <BaseButton
            form
            variant="action"
            :disabled="!groupTypeChanged || savingGroupType"
            @click="confirmGroupTypeChange"
          >
            {{
              savingGroupType
                ? t('common.buttons.saving')
                : t('common.buttons.save')
            }}
          </BaseButton>
        </BaseRow>
      </BaseFormContent>
    </div>

    <div>
      <PageHeader>{{ t('groups.settings.general.dalton.title') }}</PageHeader>
      <p class="text-base/relaxed text-on-ghost-muted m-0 mb-4 max-w-160">
        {{ t('groups.settings.general.dalton.description') }}
      </p>

      <BaseFormContent class="max-w-120">
        <div class="flex flex-col max-md:-mx-6">
          <BaseList
            v-model:checked="daltonInput"
            toggle
            :separator="false"
            :disabled="!canEditGroupType || savingDaltonEnabled"
          >
            <template #label>
              {{ t('groups.settings.general.dalton.toggle_title') }}
            </template>
            <template #desc>
              {{ t('groups.settings.general.dalton.toggle_description') }}
            </template>
          </BaseList>
        </div>

        <BaseRow
          v-if="canEditGroupType"
          stack-on-mobile
          justify="end"
          class="w-full mt-2 gap-2"
        >
          <BaseButton
            form
            variant="ghost"
            :disabled="!daltonChanged || savingDaltonEnabled"
            @click="daltonInput = activeGroupDaltonEnabled"
          >
            {{ t('common.buttons.cancel') }}
          </BaseButton>
          <BaseButton
            form
            variant="action"
            :disabled="!daltonChanged || savingDaltonEnabled"
            @click="confirmDaltonChange"
          >
            {{
              savingDaltonEnabled
                ? t('common.buttons.saving')
                : t('common.buttons.save')
            }}
          </BaseButton>
        </BaseRow>
      </BaseFormContent>
    </div>

    <div v-if="hasOwnerRights">
      <h3 class="text-danger">
        {{ t('groups.settings.general.delete_group.danger_zone_title') }}
      </h3>
      <p class="text-base/relaxed text-on-ghost-muted m-0 mb-5">
        {{ t('groups.settings.general.delete_group.warning_text') }}
      </p>

      <BaseButton
        form
        variant="danger"
        :icon="Trash2"
        @click="deleteModalOpen = true"
      >
        {{ t('groups.settings.general.delete_group.button') }}
      </BaseButton>

      <DeleteGroupModal
        :open="deleteModalOpen"
        :group-name="groupName"
        :loading="deletingGroup"
        @cancel="deleteModalOpen = false"
        @confirm="confirmDeleteGroup"
      />
    </div>
  </div>
</template>
