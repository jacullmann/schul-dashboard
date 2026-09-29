import type { Ref } from 'vue';
import type { HwItem, ItemType } from '@/modules/tasks/types';

export interface HwContext {
  user: Ref<Record<string, any> | null>;
  tab: Ref<ItemType>;
  showOldEntries: Ref<boolean>;
  subjectFilter: Ref<string>;
  hideChecked: Ref<boolean>;
  /** The group this task page belongs to. */
  groupId: string;
  showPersonalized: Ref<boolean>;

  items: Ref<HwItem[]>;
  /** Items the server left out because of the member's course selection. */
  hiddenByCourses: Ref<number>;
  loading: Ref<boolean>;
  checksLoading: Ref<boolean>;
  pinsLoading: Ref<boolean>;
  initialLoad: Ref<boolean>;
  visibleCount: Ref<number>;

  checkedItems: Ref<Set<string>>;
  pinnedItems: Ref<Set<string>>;
  archivedItems: Ref<Set<string>>;
  keptItems: Ref<Set<string>>;
  dismissedItems: Ref<Set<string>>;
  pendingCheckRemovals: Ref<Set<string>>;
  useListTransitions: Ref<boolean>;

  openMenuId: Ref<string | null>;

  /** The task the page shows on its own, if one is open. */
  openedItemId: Readonly<Ref<string | null>>;
  /**
   * The opened task as last seen. It outlives the list's copy, since a task
   * can be opened from a link while the list holds another tab, or be dropped
   * from the list while it stays open.
   */
  openedItem: Ref<HwItem | null>;

  reloadList: () => Promise<void>;
  refreshItem: (itemId: string) => Promise<void>;
}

/** The loaded copy of a task, from the list or the task open on its own. */
export function findLoadedItem(ctx: HwContext, itemId: string) {
  return (
    ctx.items.value.find((item) => item.id === itemId) ??
    (ctx.openedItem.value?.id === itemId ? ctx.openedItem.value : undefined)
  );
}
