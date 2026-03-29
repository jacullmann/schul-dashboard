import { ref } from 'vue';
import type { Ref } from 'vue';
import type { HwItem } from '@/modules/tasks/types';
import hw from '@/api/hwApi';
import { useToast } from '@/common/composables/useToast';

export function useHwActions(
  user: Ref<Record<string, unknown> | null>,
  checkedItems: Ref<Set<string>>,
  pinnedItems: Ref<Set<string>>,
  archivedItems: Ref<Set<string>>,
  keptItems: Ref<Set<string>>,
  activeGroupId: Ref<string | null>,
  handleSuccessAction: (msg: string) => void,
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
    if (!user.value) {
      pinnedItems.value = new Set();
      pinsLoading.value = false;
      return;
    }
    try {
      const { data } = await hw.get('/api/user/pins');
      pinnedItems.value = new Set(data.itemIds || []);
    } catch {
      pinnedItems.value = new Set();
    } finally {
      pinsLoading.value = false;
    }
  }

  function isChecked(itemId: string) {
    return checkedItems.value.has(itemId);
  }
  function isPinned(itemId: string) {
    return pinnedItems.value.has(itemId);
  }

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
      const config = activeGroupId.value
        ? { headers: { 'x-tenant-id': activeGroupId.value } }
        : {};
      if (wasChecked) {
        await hw.delete(`/api/user/items/${id}/check`, config);
      } else {
        await hw.post(`/api/user/items/${id}/check`, {}, config);
      }
    } catch {
      // Revert on failure
      if (wasChecked) {
        checkedItems.value.add(id);
      } else {
        checkedItems.value.delete(id);
      }
      useToast().error('Fehler beim Setzen des Status.', 4000);
    }
  }

  function isArchived(itemId: string) {
    return archivedItems.value.has(itemId);
  }
  function isKept(itemId: string) {
    return keptItems.value.has(itemId);
  }

  async function toggleVisibility(
    item: HwItem,
    isOldEntriesView: boolean,
    cutoffIso: string,
  ): Promise<boolean> {
    const id = item.id;
    let newStatus: 'archived' | 'kept' | null = null;
    const originalArchived = isArchived(id);
    const originalKept = isKept(id);

    const isNaturallyOld = item.dueDate < cutoffIso;

    if (isOldEntriesView) {
      // We are in the archive.
      // If it's naturally old, swiping keeps it.
      // If it's forced old (archived), swiping removes the archived status.
      if (isNaturallyOld) {
        newStatus = 'kept';
      } else {
        newStatus = null; // Remove forced archive
      }
    } else {
      // We are in the active view.
      // If it's naturally active, swiping archives it.
      // If it's forced active (kept), swiping removes the kept status.
      if (!isNaturallyOld) {
        newStatus = 'archived';
      } else {
        newStatus = null; // Remove forced keep
      }
    }

    // Optimistic UI
    archivedItems.value.delete(id);
    keptItems.value.delete(id);
    if (newStatus === 'archived') archivedItems.value.add(id);
    if (newStatus === 'kept') keptItems.value.add(id);

    if (!user.value) return true; // local only

    try {
      const config = activeGroupId.value
        ? { headers: { 'x-tenant-id': activeGroupId.value } }
        : {};
      if (newStatus === null) {
        await hw.delete(`/api/user/items/${id}/visibility`, config);
      } else {
        await hw.post(
          `/api/user/items/${id}/visibility`,
          { status: newStatus },
          config,
        );
      }
      return true;
    } catch {
      // Revert
      archivedItems.value.delete(id);
      keptItems.value.delete(id);
      if (originalArchived) archivedItems.value.add(id);
      if (originalKept) keptItems.value.add(id);
      useToast().error('Fehler bei der Statusänderung.', 4000);
      return false;
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
      const config = activeGroupId.value
        ? { headers: { 'x-tenant-id': activeGroupId.value } }
        : {};
      if (wasPinned) {
        await hw.delete(`/api/user/items/${id}/pin`, config);
      } else {
        await hw.post(`/api/user/items/${id}/pin`, {}, config);
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
      useToast().error('Fehler beim Setzen des Status.', 4000);
    }
  }

  function canEdit(createdBy: string) {
    return user.value?.id === createdBy;
  }

  function canDelete(createdBy: string) {
    if (!user.value) return false;
    const u = user.value as any;
    return (
      u.role === 'superadmin' ||
      u.tenantRole === 'admin' ||
      u.tenantRole === 'moderator' ||
      u.id === createdBy
    );
  }

  function canDeleteImage(
    itemCreatedBy: string | undefined,
    imageCreatedBy: string | undefined,
  ) {
    if (!user.value) return false;
    const u = user.value as any;
    return (
      u.role === 'superadmin' ||
      u.tenantRole === 'admin' ||
      u.tenantRole === 'moderator' ||
      u.id === imageCreatedBy ||
      u.id === itemCreatedBy
    );
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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      useToast().error(err.response?.data?.error || 'Fehler beim Löschen.');
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
    useToast().info('Melde...', 10000);

    try {
      await hw.post('/api/items/reports', {
        itemId: item.id,
        itemTitle: item.title,
        category,
        reason,
      });
      useToast().success('Eintrag gemeldet.', 7000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      useToast().error(
        'Fehler beim Melden: ' + (err.response?.data?.error || ''),
        { duration: 7000 },
      );
    }
  }

  function cancelReport() {
    showReportConfirm.value = false;
    reportTarget.value = null;
    reportReason.value = '';
  }

  async function shareItem(item: HwItem) {
    const groupId = window.location.pathname.match(/\/groups\/([^/]+)/)?.[1];
    const shareUrl = groupId
      ? `${window.location.origin}/groups/${groupId}/items/${item.type}/${item.id}`
      : `${window.location.origin}/items/${item.type}/${item.id}`;

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
        useToast().success('Link in die Zwischenablage kopiert!', 3000);
      } catch {
        useToast().error('Teilen fehlgeschlagen.', 3000);
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
    isArchived,
    isKept,
    toggleCheck,
    togglePin,
    toggleVisibility,
    canEdit,
    canDelete,
    canDeleteImage,
    deleteItem,
    cancelDelete,
    confirmDelete,
    reportItem,
    doReport,
    cancelReport,
    shareItem,
  };
}
