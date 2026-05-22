import { useModalStore } from '@/stores/modalStore';

export function useSearchModal() {
  const store = useModalStore();

  return {
    isSearchOpen: store.searchOpen as Readonly<typeof store.searchOpen>,
    searchMode: store.searchMode as Readonly<typeof store.searchMode>,
    openSearch: store.openSearch,
    closeSearch: store.closeSearch,
    toggleSearch: store.toggleSearch,
  };
}
