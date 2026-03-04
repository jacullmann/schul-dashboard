import { ref } from 'vue';

export function useHwUi() {
    const openMenuId = ref<string | null>(null);
    const highlightedItemId = ref<string | null>(null);
    const expandedDescriptions = ref<Set<string>>(new Set());
    const revealedImages = ref<Set<string>>(new Set());

    function isExpanded(id: string) {
        return expandedDescriptions.value.has(id);
    }

    function toggleDescription(id: string) {
        if (expandedDescriptions.value.has(id)) expandedDescriptions.value.delete(id);
        else expandedDescriptions.value.add(id);
    }

    function toggleMenu(id: string) {
        openMenuId.value = openMenuId.value === id ? null : id;
    }

    function onDocumentClick() {
        if (openMenuId.value) openMenuId.value = null;
    }

    function isRevealed(itemId: string) {
        return revealedImages.value.has(itemId);
    }

    function revealImages(itemId: string) {
        revealedImages.value.add(itemId);
    }

    return {
        openMenuId,
        highlightedItemId,
        expandedDescriptions,
        revealedImages,
        isExpanded,
        toggleDescription,
        toggleMenu,
        onDocumentClick,
        isRevealed,
        revealImages
    };
}
