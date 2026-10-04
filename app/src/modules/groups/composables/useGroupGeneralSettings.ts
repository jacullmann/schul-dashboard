import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api';
import { groupPath } from '@/api/groupPath';
import { apiErrorMessage } from '@/api/errors';
import { useToast } from '@/common/composables/useToast';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import type { GroupType } from '@/types/groups';

interface GroupSettingsPatch {
  name?: string;
  avatarId?: string | null;
  groupType?: GroupType;
  daltonEnabled?: boolean;
}

/** The group's name, picture, type and Dalton setting, and deleting it. */
export function useGroupGeneralSettings() {
  const groupId = useGroupPageId();
  const { t } = useI18n();
  const toast = useToast();
  const { groupName: authGroupName, checkAuthStatus } = useAppAuth();

  const groupName = computed(
    () => authGroupName.value || t('groups.settings.group_fallback'),
  );
  const editingGroupName = ref(false);
  const newGroupName = ref('');
  const savingGroupName = ref(false);
  const savingGroupType = ref(false);
  const savingDaltonEnabled = ref(false);

  async function patchSettings(patch: GroupSettingsPatch) {
    await api.patch(groupPath(groupId, '/admin/settings'), patch);
    await checkAuthStatus();
  }

  function startEditGroupName() {
    newGroupName.value = groupName.value;
    editingGroupName.value = true;
  }

  function cancelEditGroupName() {
    editingGroupName.value = false;
    newGroupName.value = '';
  }

  async function saveGroupName() {
    const name = newGroupName.value.trim();
    if (!name) return;
    savingGroupName.value = true;
    try {
      await api.patch(groupPath(groupId, '/admin/settings'), { name });
      toast.success(t('groups.settings.messages.group_name_updated'));
      editingGroupName.value = false;
      await checkAuthStatus();
    } catch (e) {
      toast.error(
        apiErrorMessage(
          e,
          t('groups.settings.messages.group_name_save_failed'),
        ),
      );
    } finally {
      savingGroupName.value = false;
    }
  }

  /** `avatarId` names an upload from `uploadGroupAvatar`; `null` removes the picture. */
  async function saveGroupAvatar(avatarId: string | null) {
    try {
      await patchSettings({ avatarId });
      toast.success(
        avatarId
          ? t('groups.settings.general.avatar.errors.update_success')
          : t('groups.settings.general.avatar.errors.delete_success'),
      );
    } catch (e) {
      toast.error(
        apiErrorMessage(
          e,
          t('groups.settings.general.avatar.errors.save_group_picture'),
        ),
      );
      throw e;
    }
  }

  async function saveGroupType(groupType: GroupType): Promise<boolean> {
    savingGroupType.value = true;
    try {
      await patchSettings({ groupType });
      toast.success(t('groups.settings.general.group_type.success'));
      return true;
    } catch (e) {
      toast.error(
        apiErrorMessage(e, t('groups.settings.general.group_type.failed')),
      );
      return false;
    } finally {
      savingGroupType.value = false;
    }
  }

  async function saveDaltonEnabled(daltonEnabled: boolean): Promise<boolean> {
    savingDaltonEnabled.value = true;
    try {
      await patchSettings({ daltonEnabled });
      toast.success(t('groups.settings.general.dalton.success'));
      return true;
    } catch (e) {
      toast.error(
        apiErrorMessage(e, t('groups.settings.general.dalton.failed')),
      );
      return false;
    } finally {
      savingDaltonEnabled.value = false;
    }
  }

  async function deleteGroup(): Promise<boolean> {
    try {
      await api.delete(groupPath(groupId));
      toast.success(t('groups.settings.messages.group_deleted'));
      return true;
    } catch (e) {
      toast.error(
        apiErrorMessage(e, t('groups.settings.messages.group_delete_failed')),
      );
      return false;
    }
  }

  return {
    groupName,
    editingGroupName,
    newGroupName,
    savingGroupName,
    startEditGroupName,
    cancelEditGroupName,
    saveGroupName,
    saveGroupAvatar,
    savingGroupType,
    saveGroupType,
    savingDaltonEnabled,
    saveDaltonEnabled,
    deleteGroup,
  };
}
