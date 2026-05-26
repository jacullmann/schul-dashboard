import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useModalStore } from '@/stores/modalStore';
import type { HwItem } from '@/modules/tasks/types';
import hw from '@/api/hwApi';
import type { HwContext } from './types';

export function useHwActions(
  ctx: HwContext,
  handleSuccessAction: (msg: string) => void,
) {
  const { t } = useI18n();
  const modalStore = useModalStore();
  const deletingEntry = ref(false);

  const showReportConfirm = ref(false);
  const reportReason = ref('');
  const reportTarget = ref<HwItem | null>(null);

  const getConfig = () =>
    ctx.activeGroupId.value
      ? { headers: { 'x-tenant-id': ctx.activeGroupId.value } }
      : {};

  async function loadPinnedForMe() {
    ctx.pinsLoading.value = true;
    if (!ctx.user.value) {
      ctx.pinnedItems.value = new Set();
      ctx.pinsLoading.value = false;
      return;
    }
    try {
      const { data } = await hw.get('/api/user/pins');
      ctx.pinnedItems.value = new Set(data.itemIds || []);
    } catch {
      ctx.pinnedItems.value = new Set();
    } finally {
      ctx.pinsLoading.value = false;
    }
  }

  function isChecked(itemId: string) {
    return ctx.checkedItems.value.has(itemId);
  }
  function isPinned(itemId: string) {
    return ctx.pinnedItems.value.has(itemId);
  }
  function isArchived(itemId: string) {
    return ctx.archivedItems.value.has(itemId);
  }
  function isKept(itemId: string) {
    return ctx.keptItems.value.has(itemId);
  }

  async function toggleCheck(item: HwItem) {
    if (!ctx.user.value) return;
    const id = item.id;
    const wasChecked = isChecked(id);

    if (wasChecked) ctx.checkedItems.value.delete(id);
    else ctx.checkedItems.value.add(id);

    try {
      if (wasChecked)
        await hw.delete(`/api/user/items/${id}/check`, getConfig());
      else await hw.post(`/api/user/items/${id}/check`, {}, getConfig());
    } catch {
      if (wasChecked) ctx.checkedItems.value.add(id);
      else ctx.checkedItems.value.delete(id);
      handleSuccessAction('Fehler beim Setzen des Status.'); // fallback msg
    }
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

    if (isOldEntriesView) newStatus = isNaturallyOld ? 'kept' : null;
    else newStatus = !isNaturallyOld ? 'archived' : null;

    ctx.archivedItems.value.delete(id);
    ctx.keptItems.value.delete(id);
    if (newStatus === 'archived') ctx.archivedItems.value.add(id);
    if (newStatus === 'kept') ctx.keptItems.value.add(id);

    if (!ctx.user.value) return true;

    try {
      if (newStatus === null)
        await hw.delete(`/api/user/items/${id}/visibility`, getConfig());
      else
        await hw.post(
          `/api/user/items/${id}/visibility`,
          { status: newStatus },
          getConfig(),
        );
      return true;
    } catch {
      ctx.archivedItems.value.delete(id);
      ctx.keptItems.value.delete(id);
      if (originalArchived) ctx.archivedItems.value.add(id);
      if (originalKept) ctx.keptItems.value.add(id);
      return false;
    }
  }

  async function togglePin(item: HwItem) {
    if (!ctx.user.value) return;
    const id = item.id;
    const wasPinned = isPinned(id);

    if (wasPinned) ctx.pinnedItems.value.delete(id);
    else ctx.pinnedItems.value.add(id);

    try {
      if (wasPinned) await hw.delete(`/api/user/items/${id}/pin`, getConfig());
      else await hw.post(`/api/user/items/${id}/pin`, {}, getConfig());
    } catch {
      if (wasPinned) ctx.pinnedItems.value.add(id);
      else ctx.pinnedItems.value.delete(id);
    }
  }

  function canEdit(createdBy: string) {
    return ctx.user.value?.id === createdBy;
  }

  function canDelete(createdBy: string) {
    if (!ctx.user.value) return false;
    const u = ctx.user.value as any;
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
    if (!ctx.user.value) return false;
    const u = ctx.user.value as any;
    return (
      u.role === 'superadmin' ||
      u.tenantRole === 'admin' ||
      u.tenantRole === 'moderator' ||
      u.id === imageCreatedBy ||
      u.id === itemCreatedBy
    );
  }

  async function deleteItem(id: string) {
    const isConfirmed = await modalStore.confirm({
      title: t('tasks.actions.delete_modal.title'),
      content:
        t('tasks.actions.delete_modal.message'),
      submitText: t('tasks.actions.delete_modal.submit'),
      danger: true,
    });

    if (!isConfirmed) return;

    deletingEntry.value = true;
    try {
      await hw.delete(`/api/items/${id}`);
      ctx.items.value = ctx.items.value.filter((item) => item.id !== id);
      handleSuccessAction(t('tasks.actions.delete_modal.success'));
    } catch (e: any) {
      handleSuccessAction(e.response?.data?.error || t('tasks.actions.delete_modal.error'));
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
    handleSuccessAction('Melde...');

    try {
      await hw.post('/api/items/reports', {
        itemId: item.id,
        itemTitle: item.title,
        category,
        reason,
      });
      handleSuccessAction('Eintrag gemeldet.');
    } catch (e: any) {
      handleSuccessAction(
        'Fehler beim Melden: ' + (e.response?.data?.error || ''),
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
          title: 'schul-dashboard',
          text: item.title,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Teilen abgebrochen:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        handleSuccessAction('Link in die Zwischenablage kopiert!');
      } catch {
        handleSuccessAction('Teilen fehlgeschlagen.');
      }
    }
  }

  return {
    deletingEntry,
    showReportConfirm,
    reportReason,
    reportTarget,
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
    reportItem,
    doReport,
    cancelReport,
    shareItem,
  };
}
