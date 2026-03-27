import { useModalStore } from '@/stores/modalStore';

/**
 * Thin composable wrapper around the modal store's search-modal slice.
 * Keeps the public API identical so existing call-sites need no changes.
 */
export function useSearchModal() {
  const store = useModalStore();

  return {
    isSearchOpen: store.searchOpen as Readonly<typeof store.searchOpen>,
    openSearch: store.openSearch,
    closeSearch: store.closeSearch,
    toggleSearch: store.toggleSearch,
  };
}
