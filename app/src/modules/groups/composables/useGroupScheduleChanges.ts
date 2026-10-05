import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/api';
import { groupPath } from '@/api/groupPath';
import { useToast } from '@/common/composables/useToast';
import { useGroupPageId } from '@/core/composables/useGroupPageId';
import type { ScheduleSubstitution } from '@/modules/groups/types';
import { useConfirmModal } from '@/stores/modalStore';
import { isoDate, mondayOf } from '@/modules/schedule/utils/weekday';

/** The changes entered for this week and the weeks after it. */
export function useGroupScheduleChanges() {
  const groupId = useGroupPageId();
  const { t } = useI18n();
  const toast = useToast();
  const confirmModal = useConfirmModal();

  const changes = ref<ScheduleSubstitution[]>([]);
  const loadingChanges = ref(false);

  async function loadChanges() {
    loadingChanges.value = true;
    try {
      const { data } = await api.get<ScheduleSubstitution[]>(
        groupPath(groupId, '/admin/schedule/subs'),
        { params: { from: isoDate(mondayOf(new Date())) } },
      );
      changes.value = data;
    } catch {
      toast.error(t('groups.settings.messages.load_substitutions_failed'));
    } finally {
      loadingChanges.value = false;
    }
  }

  async function deleteChange(id: string) {
    const isConfirmed = await confirmModal.ask({
      title: t('groups.settings.schedule.changes.delete_modal.title'),
      content: t('groups.settings.schedule.changes.delete_modal.message'),
      submitText: t('common.buttons.delete'),
      danger: true,
    });
    if (!isConfirmed) return;

    try {
      await api.delete(groupPath(groupId, `/admin/schedule/subs/${id}`));
      changes.value = changes.value.filter((change) => change.id !== id);
      toast.success(t('groups.settings.messages.substitution_deleted'));
    } catch {
      toast.error(t('groups.settings.messages.substitution_delete_failed'));
    }
  }

  onMounted(loadChanges);

  return { changes, loadingChanges, loadChanges, deleteChange };
}
