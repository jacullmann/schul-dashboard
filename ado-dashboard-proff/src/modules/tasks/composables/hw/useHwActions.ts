import { ref } from 'vue';
import type { Ref } from 'vue';
import type { HwItem } from '@/modules/tasks/types';
import hw from '@/api/hwApi';

export function useHwActions(
    user: Ref<any>,
    checkedItems: Ref<Set<string>>,
    pinnedItems: Ref<Set<string>>,
    flashMessage: (text: string, error?: boolean, durationMs?: number) => void,
    handleSuccessAction: (msg: string) => void
) {
    const showDeleteConfirm = ref(false);
    const itemToDelete = ref<string | null>(null);
    const deletingEntry = ref(false);

    const showReportConfirm = ref(false);
    const reportReason = ref('');
    const reportTarget = ref<HwItem | null>(null);
    const pinsLoading = ref(true);

    async function loadPinnedForMe() {
        pinsLoading.value = true;
        if (!user.value) { pinnedItems.value = new Set(); pinsLoading.value = false; return; }
        try {
            const { data } = await hw.get('/api/user/pins');
            pinnedItems.value = new Set(data.itemIds || []);
        } catch { pinnedItems.value = new Set(); }
        finally { pinsLoading.value = false; }
    }

    function isChecked(itemId: string) { return checkedItems.value.has(itemId); }
    function isPinned(itemId: string) { return pinnedItems.value.has(itemId); }

    async function toggleCheck(item: HwItem) {
        if (!user.value) return;
        const id = item.id;
        const wasChecked = isChecked(id);

        // Optimistic update
        if (wasChecked) {
            checkedItems.value.delete(id);
        } else {
            checkedItems.value.add(id);
        }

        try {
            if (wasChecked) {
                await hw.delete(`/api/user/items/${id}/check`);
            } else {
                await hw.post(`/api/user/items/${id}/check`);
            }
        } catch {
            // Revert on failure
            if (wasChecked) {
                checkedItems.value.add(id);
            } else {
                checkedItems.value.delete(id);
            }
            flashMessage('Fehler beim Setzen des Status.', true, 4000);
        }
    }

    async function togglePin(item: HwItem) {
        if (!user.value) return;
        const id = item.id;
        const wasPinned = isPinned(id);

        // Optimistic update
        const newPins = new Set(pinnedItems.value);
        if (wasPinned) {
            newPins.delete(id);
        } else {
            newPins.add(id);
        }
        pinnedItems.value = newPins;

        try {
            if (wasPinned) {
                await hw.delete(`/api/user/items/${id}/pin`);
            } else {
                await hw.post(`/api/user/items/${id}/pin`);
            }
        } catch {
            // Revert on failure
            const revertedPins = new Set(pinnedItems.value);
            if (wasPinned) {
                revertedPins.add(id);
            } else {
                revertedPins.delete(id);
            }
            pinnedItems.value = revertedPins;
            flashMessage('Fehler beim Setzen des Status.', true, 4000);
        }
    }

    function canEdit(createdBy: string) {
        return user.value?.id === createdBy;
    }

    function canDelete(createdBy: string) {
        if (!user.value) return false;
        return user.value.role === 'superadmin' || user.value.id === createdBy;
    }

    function canDeleteImage(itemCreatedBy: string, imageCreatedBy: string) {
        if (!user.value) return false;
        return user.value.role === 'superadmin' || user.value.id === imageCreatedBy || user.value.id === itemCreatedBy;
    }

    function deleteItem(id: string) {
        itemToDelete.value = id;
        showDeleteConfirm.value = true;
    }

    function cancelDelete() {
        showDeleteConfirm.value = false;
        itemToDelete.value = null;
    }

    async function confirmDelete() {
        if (!itemToDelete.value || deletingEntry.value) return;

        deletingEntry.value = true;
        const id = itemToDelete.value;

        try {
            await hw.delete(`/api/items/${id}`);
            showDeleteConfirm.value = false;
            itemToDelete.value = null;
            handleSuccessAction('Eintrag gelöscht.');
        } catch (e: any) {
            flashMessage(e.response?.data?.error || 'Fehler beim Löschen.', true);
        } finally {
            deletingEntry.value = false;
        }
    }

    function reportItem(item: HwItem) {
        reportTarget.value = item;
        reportReason.value = '';
        showReportConfirm.value = true;
    }

    async function doReport(category: 'illegal' | 'falschinfo') {
        if (!reportTarget.value) return;
        const item = reportTarget.value;
        const reason = reportReason.value;
        cancelReport();
        flashMessage('Melde...', false, 10000);

        try {
            await hw.post('/api/items/reports', {
                itemId: item.id,
                itemTitle: item.title,
                category,
                reason,
            });
            flashMessage('Eintrag gemeldet.', false, 7000);
        } catch (e: any) {
            flashMessage('Fehler beim Melden: ' + (e.response?.data?.error || ''), true, 7000);
        }
    }

    function cancelReport() {
        showReportConfirm.value = false;
        reportTarget.value = null;
        reportReason.value = '';
    }

    async function shareItem(item: HwItem) {
        const shareUrl = `${window.location.origin}/items/${item.type}/${item.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: `Schau dir diesen Eintrag an: ${item.title}`,
                    url: shareUrl,
                });
            } catch (err) {
                console.error('Teilen abgebrochen oder fehlgeschlagen:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                flashMessage('Link in die Zwischenablage kopiert!', false, 3000);
            } catch {
                flashMessage('Teilen fehlgeschlagen.', true, 3000);
            }
        }
    }

    return {
        showDeleteConfirm,
        itemToDelete,
        deletingEntry,
        showReportConfirm,
        reportReason,
        reportTarget,
        pinsLoading,
        loadPinnedForMe,
        isChecked,
        isPinned,
        toggleCheck,
        togglePin,
        canEdit,
        canDelete,
        canDeleteImage,
        deleteItem,
        cancelDelete,
        confirmDelete,
        reportItem,
        doReport,
        cancelReport,
        shareItem
    };
}
