import { ref } from 'vue';

// Module-level singleton — shared across all composable call-sites.
const isSearchOpen = ref(false);

export function useSearchModal() {
  function openSearch() {
    isSearchOpen.value = true;
  }

  function closeSearch() {
    isSearchOpen.value = false;
  }

  function toggleSearch() {
    isSearchOpen.value = !isSearchOpen.value;
  }

  return {
    isSearchOpen,
    openSearch,
    closeSearch,
    toggleSearch,
  };
}
