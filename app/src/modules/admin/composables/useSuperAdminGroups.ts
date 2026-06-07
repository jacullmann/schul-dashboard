import { ref } from 'vue';
import hw from '@/api/api';
import { useToast } from '@/common/composables/useToast';
import { useModalStore } from '@/stores/modalStore';
import type { SuperAdminGroup } from '../types';

const groups = ref<SuperAdminGroup[]>([]);
const loadingGroups = ref(false);

export function useSuperAdminGroups() {
    const toast = useToast();
    const modalStore = useModalStore();

    async function loadGroups() {
        loadingGroups.value = true;
        try {
            const { data } = await hw.get('/admin/groups');
            groups.value = data;
        } catch {
            toast.error('Failed to load groups.');
        } finally {
            loadingGroups.value = false;
        }
    }

    async function deleteGroup(g: SuperAdminGroup) {
        const confirmed = await modalStore.confirm({
            title: 'Delete Group?',
            content: `Delete group "${g.name}"?\n\nThis will permanently delete the group and all associated data. This cannot be undone.`,
            submitText: 'Delete',
            danger: true,
        });
        if (!confirmed) return;
        try {
            await hw.delete(`/admin/groups/${g.id}`);
            groups.value = groups.value.filter((x) => x.id !== g.id);
            toast.success(`Group "${g.name}" deleted.`);
        } catch {
            toast.error('Failed to delete group.');
        }
    }

    return { groups, loadingGroups, loadGroups, deleteGroup };
}
