import { useEventListener } from '@vueuse/core';
import type { HwContext } from './types';

export function useHwUi(ctx: HwContext) {
  function isExpanded(id: string) {
    return ctx.expandedDescriptions.value.has(id);
  }

  function toggleDescription(id: string) {
    if (ctx.expandedDescriptions.value.has(id))
      ctx.expandedDescriptions.value.delete(id);
    else ctx.expandedDescriptions.value.add(id);
    ctx.expandedDescriptions.value = new Set(ctx.expandedDescriptions.value);
  }

  function toggleMenu(id: string) {
    ctx.openMenuId.value = ctx.openMenuId.value === id ? null : id;
  }

  function onDocumentClick() {
    if (ctx.openMenuId.value) ctx.openMenuId.value = null;
  }

  function isRevealed(itemId: string) {
    return ctx.revealedImages.value.has(itemId);
  }

  function revealImages(itemId: string) {
    ctx.revealedImages.value.add(itemId);
    ctx.revealedImages.value = new Set(ctx.revealedImages.value);
  }

  useEventListener(document, 'click', onDocumentClick);

  return {
    isExpanded,
    toggleDescription,
    toggleMenu,
    onDocumentClick,
    isRevealed,
    revealImages,
  };
}
