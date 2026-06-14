import type { Ref } from 'vue';
import type { HwItem, ItemType } from '@/modules/tasks/types';

export interface HwContext {
  user: Ref<Record<string, any> | null>;
  tab: Ref<ItemType>;
  showOldEntries: Ref<boolean>;
  subjectFilter: Ref<string>;
  hideChecked: Ref<boolean>;
  activeGroupId: Ref<string | null>;
  showPersonalized: Ref<boolean>;

  items: Ref<HwItem[]>;
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

  expandedDescriptions: Ref<Set<string>>;
  revealedImages: Ref<Set<string>>;
  openMenuId: Ref<string | null>;
  highlightedItemId: Ref<string | null>;

  reloadList: (
    routeParamsItemId?: string,
    forceOldEntries?: () => void,
  ) => Promise<void>;
  refreshItem: (
    itemId: string,
    onUpdate?: (item: HwItem) => void,
  ) => Promise<void>;
}
