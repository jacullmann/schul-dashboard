import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import type { SuperAdminGroup } from '../types';

const groups = ref<SuperAdminGroup[]>([]);
const loadingGroups = ref(false);

export function useSuperAdminGroups() {
  const toast = useToast();
  const modalStore = useModalStore();
  const { t } = useI18n();

  async function loadGroups() {
    loadingGroups.value = true;
    try {
      const { data } = await hw.get('/admin/groups');
      groups.value = data;
    } catch {
      toast.error(t('admin.groups.errors.load'));
    } finally {
      loadingGroups.value = false;
    }
  }

  async function deleteGroup(g: SuperAdminGroup) {
    const confirmed = await modalStore.confirm({
      title: t('admin.groups.delete_modal.title'),
      content: t('admin.groups.delete_modal.content', { name: g.name }),
      submitText: t('common.buttons.delete'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await hw.delete(`/admin/groups/${g.id}`);
      groups.value = groups.value.filter((x) => x.id !== g.id);
      toast.success(t('admin.groups.delete_success', { name: g.name }));
    } catch {
      toast.error(t('admin.groups.errors.delete'));
    }
  }

  return { groups, loadingGroups, loadGroups, deleteGroup };
}
