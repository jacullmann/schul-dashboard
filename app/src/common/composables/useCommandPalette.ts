import { nextTick, ref, watch } from 'vue';
import { useEventListener } from '@vueuse/core';

export interface CommandPaletteProps {
  modelValue: string;
  itemCount: number;
  placeholder?: string;
  title?: string;
  idPrefix?: string;
}

export const commandPaletteDefaults = {
  placeholder: '',
  title: undefined,
  idPrefix: 'command-result-',
} as const;

/**
 * Keyboard selection shared by the command palette layouts: arrows move the
 * highlight, Enter picks it, Escape cancels. Items render with the id
 * `${idPrefix}${index}` so the highlight can be scrolled into view.
 */
export function useCommandPalette(
  props: Readonly<{ modelValue: string; itemCount: number; idPrefix: string }>,
  handlers: { select: (index: number) => void; cancel: () => void },
) {
  const selectedIndex = ref(0);

  watch([() => props.itemCount, () => props.modelValue], () => {
    selectedIndex.value = 0;
  });

  async function scrollToSelected() {
    await nextTick();
    document
      .getElementById(`${props.idPrefix}${selectedIndex.value}`)
      ?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!props.itemCount) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % props.itemCount;
      void scrollToSelected();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex.value =
        (selectedIndex.value - 1 + props.itemCount) % props.itemCount;
      void scrollToSelected();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handlers.select(selectedIndex.value);
    }
  }

  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') handlers.cancel();
  });

  function setSelectedIndex(index: number) {
    selectedIndex.value = index;
  }

  return { selectedIndex, handleKeydown, setSelectedIndex };
}
