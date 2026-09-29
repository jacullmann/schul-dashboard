import { useEventListener } from '@vueuse/core';
import type { HwContext } from './types';

export function useHwUi(ctx: HwContext) {
  function toggleMenu(id: string) {
    ctx.openMenuId.value = ctx.openMenuId.value === id ? null : id;
  }

  function onDocumentClick() {
    if (ctx.openMenuId.value) ctx.openMenuId.value = null;
  }

  useEventListener(document, 'click', onDocumentClick);

  return {
    toggleMenu,
    onDocumentClick,
  };
}
