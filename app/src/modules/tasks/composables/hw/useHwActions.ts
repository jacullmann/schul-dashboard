import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEventListener } from '@vueuse/core';
import { useModalStore } from '@/stores/modalStore';
import type { HwItem } from '@/modules/tasks/types';
import hw from '@/api/api.ts';
import type { HwContext } from './types';
import { apiErrorMessage } from '@/api/errors';

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
      const { data } = await hw.get('/user/pins');
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

  const checkTimeouts = new Map<string, number>();

  function toggleCheck(item: HwItem) {
    if (!ctx.user.value) return;
    const id = item.id;
    const wasChecked = isChecked(id);
    const isPinned = ctx.pinnedItems.value.has(id);
    const wasKeptBefore = ctx.keptItems.value.has(id);

    if (wasChecked) {
      ctx.checkedItems.value.delete(id);

      const timeoutId = checkTimeouts.get(id);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        checkTimeouts.delete(id);
      }

      ctx.pendingCheckRemovals.value.delete(id);
      ctx.pendingCheckRemovals.value = new Set(ctx.pendingCheckRemovals.value);
      if (ctx.dismissedItems.value.has(id)) {
        ctx.dismissedItems.value.delete(id);
        ctx.dismissedItems.value = new Set(ctx.dismissedItems.value);
      }
    } else {
      ctx.checkedItems.value.add(id);

      const isOld = new Date(item.dueDate) < new Date();
      const needsOldFiltering = !ctx.showOldEntries.value && isOld && !isPinned;
      const needsHideCheckedFiltering = ctx.hideChecked.value;

      if (wasKeptBefore) {
        ctx.keptItems.value.delete(id);
        ctx.keptItems.value = new Set(ctx.keptItems.value);
      }

      if (needsOldFiltering || needsHideCheckedFiltering) {
        if (needsOldFiltering) {
          ctx.useListTransitions.value = true;
          window.setTimeout(() => {
            ctx.useListTransitions.value = false;
          }, 1200);
        }
        if (needsHideCheckedFiltering) {
          ctx.pendingCheckRemovals.value.add(id);
          ctx.pendingCheckRemovals.value = new Set(
            ctx.pendingCheckRemovals.value,
          );
        }

        const timeoutId = window.setTimeout(() => {
          if (needsHideCheckedFiltering) {
            ctx.pendingCheckRemovals.value.delete(id);
            ctx.pendingCheckRemovals.value = new Set(
              ctx.pendingCheckRemovals.value,
            );
          }
          if (needsOldFiltering) {
            ctx.dismissedItems.value.add(id);
            ctx.dismissedItems.value = new Set(ctx.dismissedItems.value);
          }
          checkTimeouts.delete(id);
        }, 400);
        checkTimeouts.set(id, timeoutId);
      }
    }
    ctx.checkedItems.value = new Set(ctx.checkedItems.value);

    scheduleCheckSync(item, wasChecked, wasKeptBefore);
  }

  // The UI updates instantly; the API call is debounced per item so rapid
  // check/uncheck toggles collapse into at most one request, and requests
  // for the same item never run in parallel (no out-of-order POST/DELETE).
  const CHECK_SYNC_DELAY = 400;

  interface CheckSyncEntry {
    item: HwItem;
    serverChecked: boolean;
    // keptItems state before the first toggle, restored if the sync fails
    wasKept: boolean;
    timer?: number;
    inFlight: boolean;
  }

  const checkSync = new Map<string, CheckSyncEntry>();

  function scheduleCheckSync(
    item: HwItem,
    wasChecked: boolean,
    wasKept: boolean,
  ) {
    let entry = checkSync.get(item.id);
    if (!entry) {
      entry = { item, serverChecked: wasChecked, wasKept, inFlight: false };
      checkSync.set(item.id, entry);
    }
    entry.item = item;
    clearTimeout(entry.timer);
    entry.timer = window.setTimeout(
      () => void flushCheckSync(item.id),
      CHECK_SYNC_DELAY,
    );
  }

  async function flushCheckSync(id: string) {
    const entry = checkSync.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.timer = undefined;
    // The running request re-checks the desired state when it finishes
    if (entry.inFlight) return;

    if (!ctx.user.value) {
      checkSync.delete(id);
      return;
    }

    const desired = isChecked(id);
    if (desired === entry.serverChecked) {
      checkSync.delete(id);
      return;
    }

    entry.inFlight = true;
    let failed = false;
    try {
      if (desired) await hw.post(`/user/items/${id}/check`, {}, getConfig());
      else await hw.delete(`/user/items/${id}/check`, getConfig());
      entry.serverChecked = desired;
    } catch {
      failed = true;
    } finally {
      entry.inFlight = false;
    }

    // User toggled again during the request; the new timer takes over
    if (entry.timer !== undefined) return;

    if (failed) {
      checkSync.delete(id);
      revertCheck(entry);
      handleSuccessAction('Fehler beim Setzen des Status.'); // fallback msg
    } else if (isChecked(id) !== entry.serverChecked) {
      await flushCheckSync(id);
    } else {
      checkSync.delete(id);
    }
  }

  function revertCheck(entry: CheckSyncEntry) {
    const { item, serverChecked, wasKept } = entry;
    const id = item.id;
    if (isChecked(id) === serverChecked) return;

    if (serverChecked) {
      ctx.checkedItems.value.add(id);
      const isOld = new Date(item.dueDate) < new Date();
      if (!ctx.showOldEntries.value && isOld && !isPinned(id)) {
        ctx.dismissedItems.value.add(id);
        ctx.dismissedItems.value = new Set(ctx.dismissedItems.value);
      }
    } else {
      ctx.checkedItems.value.delete(id);
      ctx.pendingCheckRemovals.value.delete(id);
      ctx.pendingCheckRemovals.value = new Set(ctx.pendingCheckRemovals.value);
      ctx.dismissedItems.value.delete(id);
      ctx.dismissedItems.value = new Set(ctx.dismissedItems.value);
      if (wasKept) {
        ctx.keptItems.value.add(id);
        ctx.keptItems.value = new Set(ctx.keptItems.value);
      }
    }
    ctx.checkedItems.value = new Set(ctx.checkedItems.value);
  }

  // Send pending syncs right away when the page is hidden (tab switch/close)
  useEventListener(document, 'visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    for (const [id, entry] of checkSync) {
      if (entry.timer !== undefined) void flushCheckSync(id);
    }
  });

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
    ctx.archivedItems.value = new Set(ctx.archivedItems.value);
    ctx.keptItems.value = new Set(ctx.keptItems.value);

    if (!ctx.user.value) return true;

    try {
      if (newStatus === null)
        await hw.delete(`/user/items/${id}/visibility`, getConfig());
      else
        await hw.post(
          `/user/items/${id}/visibility`,
          { status: newStatus },
          getConfig(),
        );
      return true;
    } catch {
      ctx.archivedItems.value.delete(id);
      ctx.keptItems.value.delete(id);
      if (originalArchived) ctx.archivedItems.value.add(id);
      if (originalKept) ctx.keptItems.value.add(id);
      ctx.archivedItems.value = new Set(ctx.archivedItems.value);
      ctx.keptItems.value = new Set(ctx.keptItems.value);
      return false;
    }
  }

  async function togglePin(item: HwItem) {
    if (!ctx.user.value) return;
    const id = item.id;
    const wasPinned = isPinned(id);

    if (wasPinned) ctx.pinnedItems.value.delete(id);
    else ctx.pinnedItems.value.add(id);
    ctx.pinnedItems.value = new Set(ctx.pinnedItems.value);

    try {
      if (wasPinned) await hw.delete(`/user/items/${id}/pin`, getConfig());
      else await hw.post(`/user/items/${id}/pin`, {}, getConfig());
    } catch {
      if (wasPinned) ctx.pinnedItems.value.add(id);
      else ctx.pinnedItems.value.delete(id);
      ctx.pinnedItems.value = new Set(ctx.pinnedItems.value);
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
      content: t('tasks.actions.delete_modal.message'),
      submitText: t('tasks.actions.delete_modal.submit'),
      danger: true,
    });

    if (!isConfirmed) return;

    deletingEntry.value = true;
    try {
      await hw.delete(`/items/${id}`);
      ctx.items.value = ctx.items.value.filter((item) => item.id !== id);
      handleSuccessAction(t('tasks.actions.delete_modal.success'));
    } catch (e: any) {
      handleSuccessAction(
        apiErrorMessage(e, t('tasks.actions.delete_modal.error')),
      );
    } finally {
      deletingEntry.value = false;
    }
  }

  function reportItem(item: HwItem) {
    reportTarget.value = item;
    reportReason.value = '';
    showReportConfirm.value = true;
  }

  async function doReport() {
    if (!reportTarget.value) return;
    const item = reportTarget.value;
    const reason = reportReason.value;
    cancelReport();
    handleSuccessAction('Melde...');

    try {
      await hw.post('/items/reports', {
        itemId: item.id,
        itemTitle: item.title,
        reason,
      });
      handleSuccessAction('Aufgabe gemeldet.');
    } catch (e: any) {
      handleSuccessAction('Fehler beim Melden: ' + apiErrorMessage(e, ''));
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
      ? `${window.location.origin}/groups/${groupId}/tasks?type=${item.type}&highlightedTask=${item.id}`
      : `${window.location.origin}/tasks?type=${item.type}&highlightedTask=${item.id}`;

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
